import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";
import {
  type AttentionMetadata,
  type AttentionType,
  describeAttention,
} from "@/modules/attention/attention.rules";
import { syncDateAttention } from "@/modules/attention/notify";
import { issueKey } from "@/modules/issues/issue.keys";
import { visibleProjectsWhere } from "@/modules/projects/project.queries";
import { hasProjectPermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";
import { prisma } from "@/server/db";
import { NotFoundError } from "@/server/errors";

export interface InboxItem {
  id: string;
  type: NotificationType;
  createdAt: Date;
  readAt: Date | null;
  sentence: string;
  detail: string | null;
  issueKey: string | null;
  issueTitle: string | null;
  projectKey: string | null;
  projectName: string | null;
}

const notificationSelect = {
  id: true,
  type: true,
  metadata: true,
  readAt: true,
  createdAt: true,
  projectId: true,
  actor: { select: { name: true } },
  project: { select: { key: true, name: true } },
  issue: { select: { number: true, title: true, project: { select: { key: true } } } },
} satisfies Prisma.NotificationSelect;

type NotificationRow = Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>;

function visibleNotificationWhere(ctx: AuthContext): Prisma.NotificationWhereInput {
  return {
    recipientId: ctx.userId,
    OR: [{ projectId: null }, { project: visibleProjectsWhere(ctx) }],
  };
}

function readMetadata(value: Prisma.JsonValue | null): AttentionMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  return {
    ...(typeof row.fromStatus === "string" ? { fromStatus: row.fromStatus } : {}),
    ...(typeof row.toStatus === "string" ? { toStatus: row.toStatus } : {}),
    ...(typeof row.excerpt === "string" ? { excerpt: row.excerpt } : {}),
    ...(typeof row.role === "string" ? { role: row.role } : {}),
    ...(typeof row.dueDate === "string" ? { dueDate: row.dueDate } : {}),
  };
}

function toInboxItem(row: NotificationRow): InboxItem {
  const metadata = readMetadata(row.metadata);
  const key = row.issue ? issueKey(row.issue.project.key, row.issue.number) : null;
  return {
    id: row.id,
    type: row.type,
    createdAt: row.createdAt,
    readAt: row.readAt,
    sentence: describeAttention({
      type: row.type as AttentionType,
      actorName: row.actor?.name ?? null,
      issueKey: key,
      projectName: row.project?.name ?? null,
      metadata,
    }),
    detail: metadata.excerpt ?? null,
    issueKey: key,
    issueTitle: row.issue?.title ?? null,
    projectKey: row.project?.key ?? row.issue?.project.key ?? null,
    projectName: row.project?.name ?? null,
  };
}

/** Materialises due-soon and overdue notices before personal surfaces render. */
export async function refreshDateAttention(ctx: AuthContext): Promise<void> {
  await syncDateAttention(prisma, ctx);
}

export async function listInbox(ctx: AuthContext, options: { unreadOnly?: boolean; limit?: number } = {}): Promise<InboxItem[]> {
  await refreshDateAttention(ctx);
  const rows = await prisma.notification.findMany({
    where: {
      ...visibleNotificationWhere(ctx),
      ...(options.unreadOnly ? { readAt: null } : {}),
    },
    select: notificationSelect,
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 100,
  });
  return rows.map(toInboxItem);
}

export async function countUnread(ctx: AuthContext): Promise<number> {
  return prisma.notification.count({ where: { ...visibleNotificationWhere(ctx), readAt: null } });
}

export async function listRecentInbox(ctx: AuthContext, limit = 6): Promise<InboxItem[]> {
  const rows = await prisma.notification.findMany({
    where: visibleNotificationWhere(ctx),
    select: notificationSelect,
    orderBy: { createdAt: "desc" },
    take: Math.max(limit, 20),
  });
  const items = rows.map(toInboxItem);
  items.sort((a, b) => Number(Boolean(a.readAt)) - Number(Boolean(b.readAt)) || b.createdAt.getTime() - a.createdAt.getTime());
  return items.slice(0, limit);
}

async function requireOwnNotification(ctx: AuthContext, id: string) {
  const row = await prisma.notification.findFirst({
    where: { id, recipientId: ctx.userId },
    select: { id: true, projectId: true, readAt: true },
  });
  if (!row) throw new NotFoundError("Notification not found.");
  if (row.projectId && !hasProjectPermission(ctx, "project.view", row.projectId)) {
    throw new NotFoundError("Notification not found.");
  }
  return row;
}

/** Sets readAt. Does not write or update activity. */
export async function markNotificationRead(ctx: AuthContext, id: string): Promise<{ read: boolean }> {
  const row = await requireOwnNotification(ctx, id);
  if (row.readAt) return { read: true };
  await prisma.notification.update({ where: { id: row.id }, data: { readAt: new Date() } });
  return { read: true };
}

export async function markAllNotificationsRead(ctx: AuthContext): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { ...visibleNotificationWhere(ctx), readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}

export async function notificationDestination(ctx: AuthContext, id: string): Promise<string> {
  const row = await prisma.notification.findFirst({
    where: { id, ...visibleNotificationWhere(ctx) },
    select: notificationSelect,
  });
  if (!row) throw new NotFoundError("Notification not found.");
  await markNotificationRead(ctx, row.id);
  const item = toInboxItem(row);
  if (item.issueKey) return `/issues/${item.issueKey}`;
  if (item.projectKey) return `/projects/${item.projectKey}`;
  return "/inbox";
}
