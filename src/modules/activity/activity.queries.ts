import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { assertProjectPermission, assertWorkspacePermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";
import { ACTIVITY_ACTIONS, type ActivityAction } from "@/modules/activity/activity.types";
import { issueKey } from "@/modules/issues/issue.keys";
import { addCalendarDays } from "@/modules/projects/workspace.model";
import { parseCalendarDate } from "@/lib/calendar";
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
}

/** Company-wide activity. Executive-only; never reconstructed from current state. */
export async function listWorkspaceActivity(ctx: AuthContext, limit = 25): Promise<WorkspaceActivityEvent[]> {
  assertWorkspacePermission(ctx, "executive.view");
  const rows = await prisma.activityEvent.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: activitySelect,
  });
  return rows.map((row) => toView(row));
}
