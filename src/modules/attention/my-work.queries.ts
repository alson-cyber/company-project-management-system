import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { calendarDayUtc, recentWindowStart, COMPLETED_RECENT_DAYS } from "@/lib/calendar";
import type { MyWorkIssue } from "@/modules/attention/attention.rules";
import { issueKey } from "@/modules/issues/issue.keys";
import { visibleProjectsWhere } from "@/modules/projects/project.queries";
import type { AuthContext } from "@/server/access/types";
import { prisma } from "@/server/db";
import { getEnv } from "@/server/env";

const workSelect = {
  id: true,
  number: true,
  title: true,
  type: true,
  status: true,
  priority: true,
  dueDate: true,
  updatedAt: true,
  assigneeId: true,
  completedById: true,
  completedAt: true,
  project: { select: { id: true, key: true, name: true } },
  parent: { select: { title: true, type: true, parent: { select: { title: true, type: true } } } },
} satisfies Prisma.IssueSelect;

type WorkRow = Prisma.IssueGetPayload<{ select: typeof workSelect }>;

function contextOf(parent: WorkRow["parent"]): string | null {
  if (!parent) return null;
  if (parent.type === "USER_STORY") return parent.title;
  if (parent.parent?.type === "USER_STORY") return parent.parent.title;
  return parent.title;
}

function toWorkIssue(row: WorkRow): MyWorkIssue {
  return {
    id: row.id,
    key: issueKey(row.project.key, row.number),
    number: row.number,
    title: row.title,
    projectId: row.project.id,
    projectKey: row.project.key,
    projectName: row.project.name,
    type: row.type,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate ? calendarDayUtc(row.dueDate) : null,
    updatedAt: row.updatedAt.toISOString(),
    assigneeId: row.assigneeId,
    completedById: row.completedById,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    context: contextOf(row.parent),
  };
}

/** Issues assigned to the viewer, plus work the viewer completed recently. Scoped to visible projects. */
export async function loadMyWork(ctx: AuthContext): Promise<MyWorkIssue[]> {
  const since = recentWindowStart(getEnv().COMPANY_TIMEZONE, COMPLETED_RECENT_DAYS);
  const rows = await prisma.issue.findMany({
    where: {
      archivedAt: null,
      project: visibleProjectsWhere(ctx),
      OR: [
        { assigneeId: ctx.userId, status: { not: "DONE" } },
        { completedById: ctx.userId, completedAt: { gte: since } },
      ],
    },
    select: workSelect,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toWorkIssue);
}
