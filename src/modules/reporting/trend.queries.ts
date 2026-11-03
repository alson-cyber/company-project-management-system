import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { addCalendarDays, parseCalendarDate, todayInTimeZone } from "@/lib/calendar";
import { issueKey } from "@/modules/issues/issue.keys";
import { visibleProjectsWhere } from "@/modules/projects/project.queries";
import type { ReportFilters } from "@/modules/reporting/reports.model";
import { prisma } from "@/server/db";
import { getEnv } from "@/server/env";
import type { AuthContext } from "@/server/access/types";

export function companyTimeZone(): string {
  return getEnv().COMPANY_TIMEZONE;
}

export interface TrendPoint {
  day: string;
  count: number;
}

/** Completions per company calendar day. Credit is the actor on issue.completed, not the current assignee. */
export async function completionTrend(ctx: AuthContext, projectIds: string[], filters: ReportFilters): Promise<TrendPoint[]> {
  if (projectIds.length === 0) return [];
  const from = parseCalendarDate(filters.from);
  const to = parseCalendarDate(addCalendarDays(filters.to, 1));
  const rows = await prisma.$queryRaw<{ day: string; count: number }[]>(Prisma.sql`
    SELECT to_char(activity_events.occurred_at AT TIME ZONE ${companyTimeZone()}, 'YYYY-MM-DD') AS day,
           count(*)::int AS count
    FROM activity_events
    INNER JOIN issues ON issues.id = activity_events.issue_id
    WHERE activity_events.workspace_id = ${ctx.workspace.id}
      AND activity_events.action = 'issue.completed'
      AND activity_events.project_id IN (${Prisma.join(projectIds.map((id) => Prisma.sql`${id}`))})
      AND activity_events.occurred_at >= ${from}
      AND activity_events.occurred_at < ${to}
      ${filters.actorId ? Prisma.sql`AND activity_events.actor_user_id = ${filters.actorId}` : Prisma.empty}
      ${filters.issueType ? Prisma.sql`AND issues.type::text = ${filters.issueType}` : Prisma.empty}
    GROUP BY 1
    ORDER BY 1
  `);
  const counts = new Map(rows.map((row) => [row.day, Number(row.count)]));
  const points: TrendPoint[] = [];
  for (let day = filters.from; day <= filters.to; day = addCalendarDays(day, 1)) {
    points.push({ day, count: counts.get(day) ?? 0 });
  }
  return points;
}

export interface CompletionEvidence {
  actorName: string | null;
  actorUserId: string | null;
  issueKey: string;
  issueTitle: string;
  projectKey: string;
  occurredAt: Date;
  assigneeAtCompletion: string | null;
}

export async function listVisibleCompletionEvidence(ctx: AuthContext, filters: ReportFilters, take = 200): Promise<CompletionEvidence[]> {
  const rows = await prisma.activityEvent.findMany({
    where: {
      workspaceId: ctx.workspace.id,
      action: "issue.completed",
      project: { ...visibleProjectsWhere(ctx), ...(filters.projectKey ? { key: filters.projectKey } : {}) },
      occurredAt: { gte: parseCalendarDate(filters.from), lt: parseCalendarDate(addCalendarDays(filters.to, 1)) },
      ...(filters.actorId ? { actorUserId: filters.actorId } : {}),
      ...(filters.issueType ? { issue: { type: filters.issueType } } : {}),
    },
    orderBy: { occurredAt: "desc" },
    take,
    select: {
      occurredAt: true,
      actorUserId: true,
      metadata: true,
      actor: { select: { name: true } },
      project: { select: { key: true } },
      issue: { select: { number: true, title: true } },
    },
  });
  return rows.flatMap((row) => {
    if (!row.issue || !row.project) return [];
    const metadata = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {};
    const assignee = metadata.assigneeIdAtCompletion;
    return [
      {
        actorName: row.actor?.name ?? null,
        actorUserId: row.actorUserId,
        issueKey: issueKey(row.project.key, row.issue.number),
        issueTitle: row.issue.title,
        projectKey: row.project.key,
        occurredAt: row.occurredAt,
        assigneeAtCompletion: typeof assignee === "string" ? assignee : null,
      },
    ];
  });
}

export function companyToday(at: Date = new Date()): string {
  return todayInTimeZone(companyTimeZone(), at);
}
