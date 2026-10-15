import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { recordActivity } from "@/modules/activity/activity.service";
import type { AuthContext } from "@/server/access/types";
import { assertProjectPermission, hasProjectPermission } from "@/server/access/policy";
import { getAttachmentPolicy, isWithinAttachmentLimit } from "@/server/config";
import { prisma } from "@/server/db";
import { ForbiddenError, NotFoundError, ValidationError, parseInput } from "@/server/errors";
import { getObjectStorage } from "@/server/storage";
import { issueKey } from "@/modules/issues/issue.keys";
import {
  attachmentIdSchema,
  commentIdSchema,
  createCommentSchema,
  createNoteSchema,
  noteIdSchema,
  updateCommentSchema,
  updateNoteSchema,
} from "@/modules/collaboration/collaboration.schema";
import { attachmentLimitLabel, isInlineImage, sanitizeFilename, storedContentType } from "@/modules/collaboration/files";

type Tx = Prisma.TransactionClient;

interface IssueRef {
  id: string;
  projectId: string;
  number: number;
  archivedAt: Date | null;
  project: { key: string };
}

function actorOf(ctx: AuthContext) {
  return { type: "USER" as const, userId: ctx.userId };
}

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 160 ? `${flat.slice(0, 157)}…` : flat;
}

async function loadIssue(ctx: AuthContext, issueId: string, permission: "project.view" | "project.participate"): Promise<IssueRef> {
  const issue = await prisma.issue.findFirst({
    where: { id: issueId, project: { workspaceId: ctx.workspace.id } },
    select: {
      id: true,
      projectId: true,
      number: true,
      archivedAt: true,
      project: { select: { key: true } },
    },
  });
  if (!issue) throw new NotFoundError("Issue not found.");
  assertProjectPermission(ctx, permission, issue.projectId);
  return issue;
}

function assertEditable(issue: { archivedAt: Date | null }) {
  if (issue.archivedAt) throw new ValidationError("Archived issues cannot be edited. Restore them first.");
}

async function assertStillEditable(tx: Tx, issueId: string) {
  const current = await tx.issue.findFirst({ where: { id: issueId }, select: { archivedAt: true } });
  if (!current) throw new NotFoundError("Issue not found.");
  assertEditable(current);
}

function assertCanRevise(ctx: AuthContext, projectId: string, authorId: string) {
  if (ctx.userId === authorId) return;
  if (hasProjectPermission(ctx, "project.manage", projectId)) return;
  throw new ForbiddenError();
}

async function writeCollaborationActivity(
  tx: Tx,
  ctx: AuthContext,
  input: {
    action:
      | "issue.note_added"
      | "issue.note_updated"
      | "issue.note_removed"
      | "issue.comment_added"
      | "issue.comment_updated"
      | "issue.comment_removed"
      | "issue.attachment_added"
      | "issue.attachment_removed";
    entityType: "issue_note" | "issue_comment" | "issue_attachment";
    entityId: string;
    issue: IssueRef;
    before?: { excerpt?: string; filename?: string };
    after?: { excerpt?: string; filename?: string; contentType?: string; sizeBytes?: number };
  },
) {
  await recordActivity(tx, {
    workspaceId: ctx.workspace.id,
    actor: actorOf(ctx),
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    projectId: input.issue.projectId,
    issueId: input.issue.id,
    ...(input.before ? { before: input.before } : {}),
    ...(input.after ? { after: input.after } : {}),
    metadata: { issueKey: issueKey(input.issue.project.key, input.issue.number) },
  });
}

export async function addNote(ctx: AuthContext, rawInput: unknown): Promise<{ id: string }> {
  const input = parseInput(createNoteSchema, rawInput);
  const issue = await loadIssue(ctx, input.issueId, "project.participate");
  assertEditable(issue);

  return prisma.$transaction(async (tx) => {
    await assertStillEditable(tx, issue.id);
    const note = await tx.issueNote.create({
      data: { issueId: issue.id, authorId: ctx.userId, content: input.content },
      select: { id: true, content: true },
    });
    await writeCollaborationActivity(tx, ctx, {
      action: "issue.note_added",
      entityType: "issue_note",
      entityId: note.id,
      issue,
      after: { excerpt: excerpt(note.content) },
    });
    return { id: note.id };
  });
}

export async function updateNote(ctx: AuthContext, rawInput: unknown): Promise<{ changed: boolean }> {
  const input = parseInput(updateNoteSchema, rawInput);
  const note = await prisma.issueNote.findFirst({
    where: { id: input.noteId, deletedAt: null, issue: { project: { workspaceId: ctx.workspace.id } } },
    select: { id: true, content: true, authorId: true, issueId: true },
  });
  if (!note) throw new NotFoundError("Note not found.");
  const issue = await loadIssue(ctx, note.issueId, "project.participate");
  assertEditable(issue);
  assertCanRevise(ctx, issue.projectId, note.authorId);
  if (note.content === input.content) return { changed: false };

  await prisma.$transaction(async (tx) => {
    await assertStillEditable(tx, issue.id);
    await tx.issueNote.update({ where: { id: note.id }, data: { content: input.content } });
    await writeCollaborationActivity(tx, ctx, {
      action: "issue.note_updated",
      entityType: "issue_note",
      entityId: note.id,
      issue,
      before: { excerpt: excerpt(note.content) },
      after: { excerpt: excerpt(input.content) },
    });
  });
  return { changed: true };
}

export async function removeNote(ctx: AuthContext, rawInput: unknown): Promise<{ removed: boolean }> {
  const input = parseInput(noteIdSchema, rawInput);
  const note = await prisma.issueNote.findFirst({
    where: { id: input.noteId, deletedAt: null, issue: { project: { workspaceId: ctx.workspace.id } } },
    select: { id: true, content: true, authorId: true, issueId: true },
  });
  if (!note) throw new NotFoundError("Note not found.");
  const issue = await loadIssue(ctx, note.issueId, "project.participate");
  assertEditable(issue);
  assertCanRevise(ctx, issue.projectId, note.authorId);

  await prisma.$transaction(async (tx) => {
    await assertStillEditable(tx, issue.id);
    await tx.issueNote.update({ where: { id: note.id }, data: { deletedAt: new Date() } });
    await writeCollaborationActivity(tx, ctx, {
      action: "issue.note_removed",
      entityType: "issue_note",
      entityId: note.id,
      issue,
      before: { excerpt: excerpt(note.content) },
    });
  });
  return { removed: true };
}

export async function addComment(ctx: AuthContext, rawInput: unknown): Promise<{ id: string }> {
  const input = parseInput(createCommentSchema, rawInput);
  const issue = await loadIssue(ctx, input.issueId, "project.participate");
  assertEditable(issue);

  return prisma.$transaction(async (tx) => {
    await assertStillEditable(tx, issue.id);
    const comment = await tx.issueComment.create({
      data: { issueId: issue.id, authorId: ctx.userId, body: input.body },
      select: { id: true, body: true },
    });
    await writeCollaborationActivity(tx, ctx, {
      action: "issue.comment_added",
      entityType: "issue_comment",
      entityId: comment.id,
      issue,
      after: { excerpt: excerpt(comment.body) },
    });
    return { id: comment.id };
  });
}

export async function updateComment(ctx: AuthContext, rawInput: unknown): Promise<{ changed: boolean }> {
  const input = parseInput(updateCommentSchema, rawInput);
  const comment = await prisma.issueComment.findFirst({
    where: { id: input.commentId, deletedAt: null, issue: { project: { workspaceId: ctx.workspace.id } } },
    select: { id: true, body: true, authorId: true, issueId: true },
  });
  if (!comment) throw new NotFoundError("Comment not found.");
  const issue = await loadIssue(ctx, comment.issueId, "project.participate");
  assertEditable(issue);
  assertCanRevise(ctx, issue.projectId, comment.authorId);
  if (comment.body === input.body) return { changed: false };

  await prisma.$transaction(async (tx) => {
    await assertStillEditable(tx, issue.id);
    await tx.issueComment.update({ where: { id: comment.id }, data: { body: input.body } });
    await writeCollaborationActivity(tx, ctx, {
      action: "issue.comment_updated",
      entityType: "issue_comment",
      entityId: comment.id,
      issue,
      before: { excerpt: excerpt(comment.body) },
      after: { excerpt: excerpt(input.body) },
    });
  });
  return { changed: true };
}

export async function removeComment(ctx: AuthContext, rawInput: unknown): Promise<{ removed: boolean }> {
  const input = parseInput(commentIdSchema, rawInput);
  const comment = await prisma.issueComment.findFirst({
    where: { id: input.commentId, deletedAt: null, issue: { project: { workspaceId: ctx.workspace.id } } },
    select: { id: true, body: true, authorId: true, issueId: true },
  });
  if (!comment) throw new NotFoundError("Comment not found.");
  const issue = await loadIssue(ctx, comment.issueId, "project.participate");
  assertEditable(issue);
  assertCanRevise(ctx, issue.projectId, comment.authorId);

  await prisma.$transaction(async (tx) => {
    await assertStillEditable(tx, issue.id);
    await tx.issueComment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
    await writeCollaborationActivity(tx, ctx, {
      action: "issue.comment_removed",
      entityType: "issue_comment",
      entityId: comment.id,
      issue,
      before: { excerpt: excerpt(comment.body) },
    });
  });
  return { removed: true };
}

export interface StoredAttachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export async function addAttachment(
  ctx: AuthContext,
  input: { issueId: string; filename: string; contentType: string; bytes: Uint8Array },
): Promise<StoredAttachment> {
  const issue = await loadIssue(ctx, input.issueId, "project.participate");
  assertEditable(issue);

  const policy = getAttachmentPolicy();
  if (input.bytes.byteLength === 0) throw new ValidationError("Choose a file to upload.");
  if (!isWithinAttachmentLimit(policy, input.bytes.byteLength)) {
    throw new ValidationError(`Attachments must be ${attachmentLimitLabel(policy.maxBytes)} or smaller.`);
  }

  const filename = sanitizeFilename(input.filename);
  const contentType = storedContentType(input.contentType);
  const id = crypto.randomUUID();
  const objectKey = `attachments/${issue.id}/${id}`;
  const storage = await getObjectStorage();
  await storage.put(objectKey, input.bytes, { contentType, contentLength: input.bytes.byteLength });

  try {
    await prisma.$transaction(async (tx) => {
      await assertStillEditable(tx, issue.id);
      await tx.issueAttachment.create({
        data: {
          id,
          issueId: issue.id,
          uploadedById: ctx.userId,
          originalFilename: filename,
          objectKey,
          contentType,
          sizeBytes: input.bytes.byteLength,
        },
      });
      await writeCollaborationActivity(tx, ctx, {
        action: "issue.attachment_added",
        entityType: "issue_attachment",
        entityId: id,
        issue,
        after: { filename, contentType, sizeBytes: input.bytes.byteLength },
      });
    });
  } catch (error) {
    await storage.delete(objectKey);
    throw error;
  }

  return { id, filename, contentType, sizeBytes: input.bytes.byteLength };
}

export async function removeAttachment(ctx: AuthContext, rawInput: unknown): Promise<{ removed: boolean }> {
  const input = parseInput(attachmentIdSchema, rawInput);
  const attachment = await prisma.issueAttachment.findFirst({
    where: { id: input.attachmentId, deletedAt: null, issue: { project: { workspaceId: ctx.workspace.id } } },
    select: { id: true, objectKey: true, originalFilename: true, uploadedById: true, issueId: true },
  });
  if (!attachment) throw new NotFoundError("Attachment not found.");
  const issue = await loadIssue(ctx, attachment.issueId, "project.participate");
  assertEditable(issue);
  assertCanRevise(ctx, issue.projectId, attachment.uploadedById);

  await prisma.$transaction(async (tx) => {
    await assertStillEditable(tx, issue.id);
    await tx.issueAttachment.update({ where: { id: attachment.id }, data: { deletedAt: new Date() } });
    await writeCollaborationActivity(tx, ctx, {
      action: "issue.attachment_removed",
      entityType: "issue_attachment",
      entityId: attachment.id,
      issue,
      before: { filename: attachment.originalFilename },
    });
  });

  const storage = await getObjectStorage();
  await storage.delete(attachment.objectKey);
  const remaining = await storage.head(attachment.objectKey);
  if (remaining) {
    throw new ValidationError("The attachment was removed, but the stored file could not be deleted.");
  }
  return { removed: true };
}

export interface OpenedAttachment {
  filename: string;
  contentType: string;
  sizeBytes: number;
  inline: boolean;
  body: ReadableStream<Uint8Array>;
}

/** Streams an attachment after a permission check. The object key is never taken from the client. */
export async function openAttachment(ctx: AuthContext, attachmentId: string): Promise<OpenedAttachment> {
  const parsed = parseInput(attachmentIdSchema, { attachmentId });
  const attachment = await prisma.issueAttachment.findFirst({
    where: { id: parsed.attachmentId, deletedAt: null, issue: { project: { workspaceId: ctx.workspace.id } } },
    select: {
      originalFilename: true,
      objectKey: true,
      contentType: true,
      sizeBytes: true,
      issue: { select: { projectId: true } },
    },
  });
  if (!attachment) throw new NotFoundError("Attachment not found.");
  assertProjectPermission(ctx, "project.view", attachment.issue.projectId);

  const storage = await getObjectStorage();
  const object = await storage.get(attachment.objectKey);
  if (!object) throw new NotFoundError("Attachment not found.");

  const contentType = storedContentType(attachment.contentType);
  return {
    filename: attachment.originalFilename,
    contentType,
    sizeBytes: attachment.sizeBytes,
    inline: isInlineImage(contentType),
    body: object.body,
  };
}
