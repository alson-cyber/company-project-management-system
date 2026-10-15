import "server-only";
import { prisma } from "@/server/db";
import { assertProjectPermission, assertWorkspacePermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";
import type { ActivityEventView } from "@/modules/activity/activity.format";

const activitySelect = {
  id: true,
  occurredAt: true,
  action: true,
  before: true,
  after: true,
  project: { select: { key: true, name: true } },
  actor: { select: { name: true } },
} as const;

function toView(row: {
  id: string;
  occurredAt: Date;
  action: string;
  before: unknown;
  after: unknown;
  actor: { name: string } | null;
  project?: { key: string; name: string } | null;
}): ActivityEventView & { project: { key: string; name: string } | null } {
  return {
    id: row.id,
    occurredAt: row.occurredAt,
    action: row.action,
    before: row.before,
    after: row.after,
    actorName: row.actor?.name ?? null,
    project: row.project ?? null,
  };
}

export async function listProjectActivity(ctx: AuthContext, projectId: string, limit = 20): Promise<ActivityEventView[]> {
  assertProjectPermission(ctx, "project.view", projectId);
  const rows = await prisma.activityEvent.findMany({
    where: { workspaceId: ctx.workspace.id, projectId },
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: activitySelect,
  });
  return rows.map((row) => toView(row));
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
