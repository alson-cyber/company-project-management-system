"use server";

import { revalidatePath } from "next/cache";
import {
  addComment,
  addNote,
  removeAttachment,
  removeComment,
  removeNote,
  updateComment,
  updateNote,
} from "@/modules/collaboration/collaboration.service";
import { getActionAuthContext } from "@/server/access/session";
import { actionSuccess, toActionError, type ActionResult } from "@/server/errors";

export type CollaborationActionState = ActionResult<{ id?: string; changed?: boolean }> | null;

function revalidateIssue(projectKey: string, issueNumber?: string) {
  revalidatePath(`/projects/${projectKey}`);
  revalidatePath(`/projects/${projectKey}/issues`);
  if (issueNumber) revalidatePath(`/projects/${projectKey}/issues/${issueNumber}`);
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function addNoteAction(_previous: CollaborationActionState, formData: FormData): Promise<CollaborationActionState> {
  try {
    const ctx = await getActionAuthContext();
    const created = await addNote(ctx, { issueId: formData.get("issueId"), content: formData.get("content") });
    revalidateIssue(text(formData.get("projectKey")), text(formData.get("issueNumber")));
    return actionSuccess({ id: created.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateNoteAction(_previous: CollaborationActionState, formData: FormData): Promise<CollaborationActionState> {
  try {
    const ctx = await getActionAuthContext();
    const result = await updateNote(ctx, { noteId: formData.get("noteId"), content: formData.get("content") });
    revalidateIssue(text(formData.get("projectKey")), text(formData.get("issueNumber")));
    return actionSuccess({ changed: result.changed });
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeNoteAction(_previous: CollaborationActionState, formData: FormData): Promise<CollaborationActionState> {
  try {
    const ctx = await getActionAuthContext();
    await removeNote(ctx, { noteId: formData.get("noteId") });
    revalidateIssue(text(formData.get("projectKey")), text(formData.get("issueNumber")));
    return actionSuccess({});
  } catch (error) {
    return toActionError(error);
  }
}

export async function addCommentAction(_previous: CollaborationActionState, formData: FormData): Promise<CollaborationActionState> {
  try {
    const ctx = await getActionAuthContext();
    const created = await addComment(ctx, { issueId: formData.get("issueId"), body: formData.get("body") });
    revalidateIssue(text(formData.get("projectKey")), text(formData.get("issueNumber")));
    return actionSuccess({ id: created.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCommentAction(
  _previous: CollaborationActionState,
  formData: FormData,
): Promise<CollaborationActionState> {
  try {
    const ctx = await getActionAuthContext();
    const result = await updateComment(ctx, { commentId: formData.get("commentId"), body: formData.get("body") });
    revalidateIssue(text(formData.get("projectKey")), text(formData.get("issueNumber")));
    return actionSuccess({ changed: result.changed });
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeCommentAction(
  _previous: CollaborationActionState,
  formData: FormData,
): Promise<CollaborationActionState> {
  try {
    const ctx = await getActionAuthContext();
    await removeComment(ctx, { commentId: formData.get("commentId") });
    revalidateIssue(text(formData.get("projectKey")), text(formData.get("issueNumber")));
    return actionSuccess({});
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeAttachmentAction(
  _previous: CollaborationActionState,
  formData: FormData,
): Promise<CollaborationActionState> {
  try {
    const ctx = await getActionAuthContext();
    await removeAttachment(ctx, { attachmentId: formData.get("attachmentId") });
    revalidateIssue(text(formData.get("projectKey")), text(formData.get("issueNumber")));
    return actionSuccess({});
  } catch (error) {
    return toActionError(error);
  }
}
