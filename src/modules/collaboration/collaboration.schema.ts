import { z } from "zod";

export const NOTE_CATEGORIES = ["PRODUCT", "DESIGN", "TECHNICAL", "DECISION", "REQUIREMENT", "MEETING"] as const;

export const NOTE_CATEGORY_LABELS: Record<(typeof NOTE_CATEGORIES)[number], string> = {
  PRODUCT: "Product",
  DESIGN: "Design",
  TECHNICAL: "Technical",
  DECISION: "Decision",
  REQUIREMENT: "Requirement",
  MEETING: "Meeting",
};

const noteTitle = z.string().trim().min(1, "Give the note a title.").max(120, "Titles must be 120 characters or fewer.");
const noteCategory = z.enum(NOTE_CATEGORIES, { error: "Choose a category." });
const noteContent = z.string().trim().min(1, "Write a note before saving.").max(8000, "Notes must be 8,000 characters or fewer.");

const commentBody = z
  .string()
  .trim()
  .min(1, "Write a comment before saving.")
  .max(4000, "Comments must be 4,000 characters or fewer.");

export const createNoteSchema = z.object({
  issueId: z.uuid("Unknown issue."),
  title: noteTitle,
  category: noteCategory,
  content: noteContent,
});

export const updateNoteSchema = z.object({
  noteId: z.uuid("Unknown note."),
  title: noteTitle,
  category: noteCategory,
  content: noteContent,
});

export const noteIdSchema = z.object({
  noteId: z.uuid("Unknown note."),
});

export const createCommentSchema = z.object({
  issueId: z.uuid("Unknown issue."),
  body: commentBody,
});

export const updateCommentSchema = z.object({
  commentId: z.uuid("Unknown comment."),
  body: commentBody,
});

export const commentIdSchema = z.object({
  commentId: z.uuid("Unknown comment."),
});

export const attachmentIdSchema = z.object({
  attachmentId: z.uuid("Unknown attachment."),
});
