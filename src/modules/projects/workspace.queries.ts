import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { calendarDayUtc, isOverdue } from "@/lib/calendar";
import { issueKey } from "@/modules/issues/issue.keys";
import { progressOfIssue, type ProgressIssue } from "@/modules/issues/issue.progress";
import type { WorkspaceIssue } from "@/modules/projects/workspace.model";
import { attachmentKind, type AttachmentKind } from "@/modules/projects/workspace.model";
import { visibleProjectsWhere } from "@/modules/projects/project.queries";
import { prisma } from "@/server/db";
import { getEnv } from "@/server/env";
import { assertProjectPermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";

const issueSelect = {
  id: true,
  number: true,
  type: true,
  title: true,
  status: true,
  priority: true,
  parentId: true,
  dueDate: true,
  plannedStartDate: true,
  completedAt: true,
  completedById: true,
  createdById: true,
  assignee: { select: { id: true, name: true } },
  labels: { select: { label: { select: { name: true } } } },
} satisfies Prisma.IssueSelect;

/**
 * Every non-archived issue in one project, with the fields the workspace tabs share.
 * Callers derive board, overview, timeline, and team facts in memory.
 */
export async function listProjectWorkspaceIssues(ctx: AuthContext, projectId: string): Promise<WorkspaceIssue[]> {
  assertProjectPermission(ctx, "project.view", projectId);
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...visibleProjectsWhere(ctx) },
    select: { id: true, key: true },
  });
  if (!project) return [];

  const rows = await prisma.issue.findMany({
    where: { projectId: project.id, archivedAt: null },
    select: issueSelect,
    orderBy: [{ rank: "asc" }, { number: "asc" }],
  });

  const progressRows: ProgressIssue[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    parentId: row.parentId,
    status: row.status,
    archivedAt: null,
  }));
  const timeZone = getEnv().COMPANY_TIMEZONE;

  return rows.map((row) => ({
    id: row.id,
    key: issueKey(project.key, row.number),
    number: row.number,
    type: row.type,
    title: row.title,
    status: row.status,
    priority: row.priority,
    parentId: row.parentId,
    assigneeId: row.assignee?.id ?? null,
    assigneeName: row.assignee?.name ?? null,
    dueDate: row.dueDate ? calendarDayUtc(row.dueDate) : null,
    plannedStartDate: row.plannedStartDate ? calendarDayUtc(row.plannedStartDate) : null,
    overdue: isOverdue(row.dueDate, row.status, timeZone),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    completedById: row.completedById,
    createdById: row.createdById,
    labels: row.labels.map((entry) => entry.label.name),
    progress: progressOfIssue(row.id, progressRows),
  }));
}

export interface ProjectFileRow {
  id: string;
  filename: string;
  contentType: string;
  kind: AttachmentKind;
  sizeBytes: number;
  createdAt: Date;
  uploadedBy: { id: string; name: string };
  issue: { key: string; number: number; title: string };
}

export async function listProjectFiles(
  ctx: AuthContext,
  projectId: string,
  projectKey: string,
): Promise<ProjectFileRow[]> {
  assertProjectPermission(ctx, "project.view", projectId);
  const rows = await prisma.issueAttachment.findMany({
    where: { deletedAt: null, issue: { projectId, project: { workspaceId: ctx.workspace.id } } },
    select: {
      id: true,
      originalFilename: true,
      contentType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true } },
      issue: { select: { number: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    filename: row.originalFilename,
    contentType: row.contentType,
    kind: attachmentKind(row.contentType),
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt,
    uploadedBy: row.uploadedBy,
    issue: { key: issueKey(projectKey, row.issue.number), number: row.issue.number, title: row.issue.title },
  }));
}

export interface MemberNote {
  id: string;
  excerpt: string;
  createdAt: Date;
  issue: { key: string; number: number; title: string };
}

async function memberWriting(
  projectId: string,
  projectKey: string,
  userId: string,
  kind: "comment" | "note",
): Promise<MemberNote[]> {
  const where = { authorId: userId, deletedAt: null, issue: { projectId } };
  const select = {
    id: true,
    createdAt: true,
    issue: { select: { number: true, title: true } },
  } as const;
  const rows =
    kind === "comment"
      ? await prisma.issueComment.findMany({
          where,
          select: { ...select, body: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : await prisma.issueNote.findMany({
          where,
          select: { ...select, content: true },
          orderBy: { createdAt: "desc" },
          take: 8,
        });
  return rows.map((row) => ({
    id: row.id,
    excerpt: ("body" in row ? row.body : row.content).slice(0, 180),
    createdAt: row.createdAt,
    issue: { key: issueKey(projectKey, row.issue.number), number: row.issue.number, title: row.issue.title },
  }));
}

export async function listMemberWriting(
  ctx: AuthContext,
  projectId: string,
  projectKey: string,
  userId: string,
): Promise<{ comments: MemberNote[]; notes: MemberNote[] }> {
  assertProjectPermission(ctx, "project.view", projectId);
  const [comments, notes] = await Promise.all([
    memberWriting(projectId, projectKey, userId, "comment"),
    memberWriting(projectId, projectKey, userId, "note"),
  ]);
  return { comments, notes };
}
