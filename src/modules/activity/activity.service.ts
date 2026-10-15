import type { Prisma } from "@/generated/prisma/client";
import type { ActivityAction, ActivityActor, ActivityEntityType, JsonObject } from "@/modules/activity/activity.types";

export interface RecordActivityInput {
  workspaceId: string;
  actor: ActivityActor;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  projectId?: string;
  issueId?: string;
  before?: JsonObject;
  after?: JsonObject;
  metadata?: JsonObject;
}

/**
 * Appends an activity event inside the caller's transaction, so the business change and its
 * audit record commit or roll back together. This is the only writer of activity_events;
 * there is deliberately no update or delete counterpart (the table also rejects them).
 */
export async function recordActivity(tx: Prisma.TransactionClient, input: RecordActivityInput): Promise<void> {
  await tx.activityEvent.create({
    data: {
      workspaceId: input.workspaceId,
      actorType: input.actor.type,
      actorUserId: input.actor.type === "USER" ? input.actor.userId : null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      projectId: input.projectId ?? null,
      issueId: input.issueId ?? null,
      ...(input.before ? { before: input.before } : {}),
      ...(input.after ? { after: input.after } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
}
