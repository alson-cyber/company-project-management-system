import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { assertProjectPermission, assertWorkspacePermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";
import { ACTIVITY_ACTIONS, type ActivityAction } from "@/modules/activity/activity.types";
import { issueKey } from "@/modules/issues/issue.keys";
import { visibleProjectsWhere } from "@/modules/projects/project.queries";
import { addCalendarDays } from "@/modules/projects/workspace.model";
import { parseCalendarDate } from "@/lib/calendar";
import type { IssueType } from "@/generated/prisma/enums";
import type { ActivityEventView } from "@/modules/activity/activity.format";

const activitySelect = {
  id: true,
  occurredAt: true,
  action: true,
  before: true,
  after: true,
  actorUserId: true,
  project: { select: { key: true, name: true } },
  actor: { select: { name: true } },
  issue: { select: { number: true, title: true } },
} as const;

export interface ProjectActivityRow extends ActivityEventView {
  actorId: string | null;
  issue: { key: string; number: number; title: string } | null;
}

function toView(row: {
  id: string;
  occurredAt: Date;
  action: string;
  before: unknown;
  after: unknown;
  actorUserId: string | null;
  actor: { name: string } | null;
  project?: { key: string; name: string } | null;
  issue: { number: number; title: string } | null;
}): ProjectActivityRow & { project: { key: string; name: string } | null } {
  const projectKey = row.project?.key;
  return {
    id: row.id,
    occurredAt: row.occurredAt,
    action: row.action,
    before: row.before,
    after: row.after,
    actorName: row.actor?.name ?? null,
    actorId: row.actorUserId,
    project: row.project ?? null,
    issue:
      row.issue && projectKey
        ? { key: issueKey(projectKey, row.issue.number), number: row.issue.number, title: row.issue.title }
        : null,
  };
}

export interface ProjectActivityFilter {
  actorId?: string;
  action?: ActivityAction;
  issueNumber?: number;
  from?: string;
  to?: string;
}

function activityWhere(ctx: AuthContext, projectId: string, filter: ProjectActivityFilter): Prisma.ActivityEventWhereInput {
  const occurredAt: Prisma.DateTimeFilter = {};
  if (filter.from) occurredAt.gte = parseCalendarDate(filter.from);
  if (filter.to) occurredAt.lt = parseCalendarDate(addCalendarDays(filter.to, 1));
  return {
    workspaceId: ctx.workspace.id,
    projectId,
    ...(filter.actorId ? { actorUserId: filter.actorId } : {}),
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.issueNumber ? { issue: { number: filter.issueNumber } } : {}),
    ...(filter.from || filter.to ? { occurredAt } : {}),
  };
}

export async function listIssueActivity(ctx: AuthContext, issueId: string, limit = 30): Promise<ActivityEventView[]> {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId },
    select: { projectId: true },
  });
  if (!issue) return [];
  assertProjectPermission(ctx, "project.view", issue.projectId);
  const rows = await prisma.activityEvent.findMany({
    where: { workspaceId: ctx.workspace.id, issueId },
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: activitySelect,
  });
  return rows.map((row) => toView(row));
}

export async function listProjectActivity(ctx: AuthContext, projectId: string, limit = 20): Promise<ProjectActivityRow[]> {
  return listFilteredProjectActivity(ctx, projectId, {}, limit);
}

export async function listFilteredProjectActivity(
  ctx: AuthContext,
  projectId: string,
  filter: ProjectActivityFilter,
  limit = 80,
): Promise<ProjectActivityRow[]> {
  assertProjectPermission(ctx, "project.view", projectId);
  const rows = await prisma.activityEvent.findMany({
    where: activityWhere(ctx, projectId, filter),
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: activitySelect,
  });
  return rows.map((row) => toView(row));
}

export interface LatestContribution {
  id: string;
  occurredAt: Date;
  action: string;
  before: unknown;
  after: unknown;
}

/** Latest audited event per person in this project. Evidence of participation, not a ranking. */
export async function listLatestContributions(
  ctx: AuthContext,
  projectId: string,
): Promise<Map<string, LatestContribution>> {
  assertProjectPermission(ctx, "project.view", projectId);
  const rows = await prisma.$queryRaw<
    Array<{ id: string; actor_user_id: string; occurred_at: Date; action: string; before: unknown; after: unknown }>
  >(Prisma.sql`
    SELECT DISTINCT ON (actor_user_id) id, actor_user_id, occurred_at, action, before, after
    FROM activity_events
    WHERE project_id = ${projectId}
      AND workspace_id = ${ctx.workspace.id}
      AND actor_user_id IS NOT NULL
    ORDER BY actor_user_id, occurred_at DESC
  `);
  return new Map(
    rows.map((row) => [
      row.actor_user_id,
      { id: row.id, occurredAt: row.occurred_at, action: row.action, before: row.before, after: row.after },
    ]),
  );
}

export function isActivityAction(value: string): value is ActivityAction {
  return (ACTIVITY_ACTIONS as readonly string[]).includes(value);
}

export interface WorkspaceActivityEvent extends ActivityEventView {
  project: { key: string; name: string } | null;
  issue: { key: string; number: number; title: string } | null;
}

/** Company-wide activity. Executive-only; never reconstructed from current state. */
export async function listWorkspaceActivity(ctx: AuthContext, limit = 25): Promise<WorkspaceActivityEvent[]> {
  assertWorkspacePermission(ctx, "executive.view");
  const page = await listScopedActivity(ctx, { take: limit });
  return page.rows;
}

export const ACTIVITY_PAGE_SIZE = 40;
export const ACTIVITY_EXPORT_LIMIT = 1000;

export interface ScopedActivityQuery {
  projectId?: string;
  actorId?: string;
  action?: ActivityAction;
  issueType?: IssueType;
  issueNumber?: number;
  from?: string;
  to?: string;
  cursor?: string;
  take?: number;
}

export interface ScopedActivityPage {
  rows: (WorkspaceActivityEvent & { actorId: string | null })[];
  nextCursor: string | null;
}

function activityCursor(occurredAt: Date, id: string): string {
  return `${occurredAt.toISOString()}|${id}`;
}

function readCursor(cursor: string | undefined): { occurredAt: Date; id: string } | null {
  if (!cursor) return null;
  const split = cursor.lastIndexOf("|");
  if (split <= 0) return null;
  const occurredAt = new Date(cursor.slice(0, split));
  const id = cursor.slice(split + 1);
  if (Number.isNaN(occurredAt.getTime()) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  return { occurredAt, id };
}

/**
 * Activity the viewer may see, newest first. The result is one page, not the lifetime log.
 * A project id outside the viewer's visibility matches nothing.
 */
export async function listScopedActivity(ctx: AuthContext, query: ScopedActivityQuery = {}): Promise<ScopedActivityPage> {
  const take = Math.min(Math.max(query.take ?? ACTIVITY_PAGE_SIZE, 1), ACTIVITY_EXPORT_LIMIT);
  const cursor = readCursor(query.cursor);
  const rows = await prisma.activityEvent.findMany({
    where: {
      workspaceId: ctx.workspace.id,
      project: { ...visibleProjectsWhere(ctx), ...(query.projectId ? { id: query.projectId } : {}) },
      ...(query.actorId ? { actorUserId: query.actorId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            occurredAt: {
              ...(query.from ? { gte: parseCalendarDate(query.from) } : {}),
              ...(query.to ? { lt: parseCalendarDate(addCalendarDays(query.to, 1)) } : {}),
            },
          }
        : {}),
      ...(query.issueType || query.issueNumber
        ? { issue: { ...(query.issueType ? { type: query.issueType } : {}), ...(query.issueNumber ? { number: query.issueNumber } : {}) } }
        : {}),
      ...(cursor
        ? {
            OR: [
              { occurredAt: { lt: cursor.occurredAt } },
              { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: take + 1,
    select: { ...activitySelect, actorUserId: true },
  });
  const page = rows.slice(0, take);
  const last = page.at(-1);
  return {
    rows: page.map((row) => ({ ...toView(row), actorId: row.actorUserId })),
    nextCursor: rows.length > take && last ? activityCursor(last.occurredAt, last.id) : null,
  };
}
