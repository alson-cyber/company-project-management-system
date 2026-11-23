import "server-only";
import type { NoteCategory } from "@/generated/prisma/enums";
import { isInlineImage } from "@/modules/collaboration/files";
import { prisma } from "@/server/db";
import { assertProjectPermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";
import { NotFoundError } from "@/server/errors";

export interface CollaborationAuthor {
  id: string;
  name: string;
}

export interface NoteRevisionView {
  revision: number;
  title: string;
  category: NoteCategory;
  content: string;
  createdAt: Date;
  editorName: string;
}

export interface NoteView {
  id: string;
  title: string;
  category: NoteCategory;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: CollaborationAuthor;
  revisions: NoteRevisionView[];
}

export interface CommentView {
  id: string;
  body: string | null;
  deleted: boolean;
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
        title: true,
        category: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true } },
        revisions: {
          orderBy: { revision: "desc" },
          select: {
            revision: true,
            title: true,
            category: true,
            content: true,
            createdAt: true,
            editedBy: { select: { name: true } },
          },
        },
      },
    }),
    prisma.issueComment.findMany({
      where: { issueId: issue.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        body: true,
        deletedAt: true,
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
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      category: note.category,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      author: note.author,
      revisions: note.revisions.map((revision) => ({
        revision: revision.revision,
        title: revision.title,
        category: revision.category,
        content: revision.content,
        createdAt: revision.createdAt,
        editorName: revision.editedBy.name,
      })),
    })),
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.deletedAt ? null : comment.body,
      deleted: comment.deletedAt !== null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.author,
    })),
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
