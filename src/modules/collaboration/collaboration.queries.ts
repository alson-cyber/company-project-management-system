import "server-only";
import { isInlineImage } from "@/modules/collaboration/files";
import { prisma } from "@/server/db";
import { assertProjectPermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";
import { NotFoundError } from "@/server/errors";

export interface CollaborationAuthor {
  id: string;
  name: string;
}

export interface NoteView {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: CollaborationAuthor;
}

export interface CommentView {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: CollaborationAuthor;
}

export interface AttachmentView {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedBy: CollaborationAuthor;
  previewable: boolean;
}

export interface IssueCollaboration {
  notes: NoteView[];
  comments: CommentView[];
  attachments: AttachmentView[];
}

export async function listIssueCollaboration(ctx: AuthContext, issueId: string): Promise<IssueCollaboration> {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, project: { workspaceId: ctx.workspace.id } },
    select: { id: true, projectId: true },
  });
  if (!issue) throw new NotFoundError("Issue not found.");
  assertProjectPermission(ctx, "project.view", issue.projectId);

  const [notes, comments, attachments] = await Promise.all([
    prisma.issueNote.findMany({
      where: { issueId: issue.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.issueComment.findMany({
      where: { issueId: issue.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true } },
      },
    }),
    prisma.issueAttachment.findMany({
      where: { issueId: issue.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalFilename: true,
        contentType: true,
        sizeBytes: true,
        createdAt: true,
        uploadedBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    notes,
    comments,
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.originalFilename,
      contentType: attachment.contentType,
      sizeBytes: attachment.sizeBytes,
      createdAt: attachment.createdAt,
      uploadedBy: attachment.uploadedBy,
      previewable: isInlineImage(attachment.contentType),
    })),
  };
}
