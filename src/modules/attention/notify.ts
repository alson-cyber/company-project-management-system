import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { IssueStatus, ProjectRole } from "@/generated/prisma/enums";
import {
  assignmentDedupe,
  attentionDueDay,
  attentionRecipient,
  dateDedupe,
  discussionDedupe,
  dueDateForAttention,
  membershipDedupe,
  statusDedupe,
} from "@/modules/attention/attention.rules";
import { visibleProjectsWhere } from "@/modules/projects/project.queries";
import type { AuthContext } from "@/server/access/types";
import { getEnv } from "@/server/env";

type Tx = Prisma.TransactionClient;
type AttentionDb = Tx | PrismaClient;

interface Notice {
  recipientId: string;
  actorId: string | null;
  projectId: string | null;
  issueId: string | null;
  type:
    | "ISSUE_ASSIGNED"
    | "ISSUE_COMMENTED"
    | "ISSUE_NOTE_ADDED"
    | "ISSUE_STATUS_CHANGED"
    | "ISSUE_DUE_SOON"
    | "ISSUE_OVERDUE"
    | "PROJECT_MEMBERSHIP";
  dedupeKey: string;
  metadata?: Prisma.InputJsonObject;
}

export async function insertNotifications(tx: AttentionDb, notices: Notice[]): Promise<void> {
  const rows = notices.filter((notice) => attentionRecipient(notice.actorId, notice.recipientId));
  if (rows.length === 0) return;
  await tx.notification.createMany({ data: rows, skipDuplicates: true });
}

/**
 * Assignment and status attention for one issue mutation.
 * A status change notifies the existing assignee. A new assignee gets the assignment only,
 * so one action does not produce two notices for the same person.
 */
export async function notifyIssueUpdate(
  tx: Tx,
  input: {
    actorId: string;
    projectId: string;
    issueId: string;
    activityId: string;
    previousAssigneeId: string | null;
    assigneeId: string | null;
    previousStatus?: IssueStatus;
    status?: IssueStatus;
  },
): Promise<void> {
  const notices: Notice[] = [];
  const assigned = Boolean(input.assigneeId && input.assigneeId !== input.previousAssigneeId);
  if (assigned && input.assigneeId) {
    notices.push({
      recipientId: input.assigneeId,
      actorId: input.actorId,
      projectId: input.projectId,
      issueId: input.issueId,
      type: "ISSUE_ASSIGNED",
      dedupeKey: assignmentDedupe(input.issueId, input.activityId),
    });
  }
  const statusChanged = Boolean(input.status && input.previousStatus && input.status !== input.previousStatus);
  if (!assigned && statusChanged && input.assigneeId && input.previousStatus && input.status) {
    notices.push({
      recipientId: input.assigneeId,
      actorId: input.actorId,
      projectId: input.projectId,
      issueId: input.issueId,
      type: "ISSUE_STATUS_CHANGED",
      dedupeKey: statusDedupe(input.issueId, input.activityId),
      metadata: { fromStatus: input.previousStatus, toStatus: input.status },
    });
  }
  await insertNotifications(tx, notices);
}

export async function notifyDiscussion(
  tx: Tx,
  input: {
    actorId: string;
    projectId: string;
    issueId: string;
    assigneeId: string | null;
    kind: "comment" | "note";
    entityId: string;
    excerpt: string;
  },
): Promise<void> {
  if (!input.assigneeId) return;
  await insertNotifications(tx, [
    {
      recipientId: input.assigneeId,
      actorId: input.actorId,
      projectId: input.projectId,
      issueId: input.issueId,
      type: input.kind === "comment" ? "ISSUE_COMMENTED" : "ISSUE_NOTE_ADDED",
      dedupeKey: discussionDedupe(input.kind, input.entityId),
      metadata: { excerpt: input.excerpt },
    },
  ]);
}

export async function notifyMembership(
  tx: Tx,
  input: {
    actorId: string;
    projectId: string;
    userId: string;
    role: ProjectRole;
    activityId: string;
  },
): Promise<void> {
  await insertNotifications(tx, [
    {
      recipientId: input.userId,
      actorId: input.actorId,
      projectId: input.projectId,
      issueId: null,
      type: "PROJECT_MEMBERSHIP",
      dedupeKey: membershipDedupe(input.projectId, input.userId, input.activityId),
      metadata: { role: input.role },
    },
  ]);
}

/**
 * Materialises due-soon and overdue attention for the signed-in user.
 * The same issue and due date cannot insert twice. Passage of time is picked up
 * the next time a personal surface loads; it is not computed in the browser.
 */
export async function syncDateAttention(db: AttentionDb, ctx: AuthContext): Promise<void> {
  const timeZone = getEnv().COMPANY_TIMEZONE;
  const now = new Date();
  const issues = await db.issue.findMany({
    where: {
      assigneeId: ctx.userId,
      archivedAt: null,
      status: { not: "DONE" },
      dueDate: { not: null },
      project: visibleProjectsWhere(ctx),
    },
    select: { id: true, projectId: true, dueDate: true, status: true },
  });
  const notices: Notice[] = [];
  for (const issue of issues) {
    if (!issue.dueDate) continue;
    const kind = dueDateForAttention(issue.dueDate, issue.status, timeZone, now);
    if (!kind) continue;
    notices.push({
      recipientId: ctx.userId,
      actorId: null,
      projectId: issue.projectId,
      issueId: issue.id,
      type: kind === "overdue" ? "ISSUE_OVERDUE" : "ISSUE_DUE_SOON",
      dedupeKey: dateDedupe(kind, issue.id, attentionDueDay(issue.dueDate)),
      metadata: { dueDate: attentionDueDay(issue.dueDate) },
    });
  }
  await insertNotifications(db, notices);
}
