import "server-only";
import { prisma } from "@/server/db";
import { assertProjectPermission, assertWorkspacePermission, hasWorkspacePermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";

/**
 * Contribution counts are derived from historical activity, never from the current assignee.
 * Completing an issue and later reassigning it does not move completion credit.
 *
 * This is a query foundation for later reporting UI. It does not compute scores or rankings.
 */
export interface CompletionAttribution {
  actorUserId: string | null;
  actorName: string | null;
  issueId: string;
  projectId: string | null;
  occurredAt: Date;
  assigneeIdAtCompletion: unknown;
}

export async function listIssueCompletions(
  ctx: AuthContext,
  options: { projectId?: string; actorUserId?: string; take?: number } = {},
): Promise<CompletionAttribution[]> {
  if (options.projectId) {
    assertProjectPermission(ctx, "project.view", options.projectId);
  } else {
    assertWorkspacePermission(ctx, "executive.view");
  }

  const rows = await prisma.activityEvent.findMany({
    where: {
      workspaceId: ctx.workspace.id,
      action: "issue.completed",
      ...(options.projectId ? { projectId: options.projectId } : {}),
      ...(options.actorUserId ? { actorUserId: options.actorUserId } : {}),
      ...(hasWorkspacePermission(ctx, "executive.view") || options.projectId
        ? {}
        : { project: { members: { some: { userId: ctx.userId } } } }),
    },
    orderBy: { occurredAt: "desc" },
    take: options.take ?? 100,
    select: {
      actorUserId: true,
      issueId: true,
      projectId: true,
      occurredAt: true,
      metadata: true,
      actor: { select: { name: true } },
    },
  });

  return rows.flatMap((row) => {
    if (!row.issueId || !row.projectId) return [];
    const metadata = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : {};
    return [
      {
        actorUserId: row.actorUserId,
        actorName: row.actor?.name ?? null,
        issueId: row.issueId,
        projectId: row.projectId,
        occurredAt: row.occurredAt,
        assigneeIdAtCompletion: metadata.assigneeIdAtCompletion ?? null,
      },
    ];
  });
}
