import { z } from "zod";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES } from "@/modules/issues/issue.constants";
import { plannedRangeError } from "@/modules/projects/workspace.model";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .transform((value) => (value ? value : undefined));

const emptyToUndefined = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  });

export const storyFieldsSchema = z.object({
  asA: z.string().trim().min(1, "As a is required.").max(200, "As a must be 200 characters or fewer."),
  iWant: z.string().trim().min(1, "I want is required.").max(400, "I want must be 400 characters or fewer."),
  soThat: z.string().trim().min(1, "So that is required.").max(400, "So that must be 400 characters or fewer."),
});

export const criterionTextSchema = z
  .string()
  .trim()
  .min(1, "Acceptance criterion text is required.")
  .max(500, "Acceptance criteria must be 500 characters or fewer.");

const optionalCalendarDate = z
  .union([z.iso.date("Use a valid date."), z.literal("")])
  .optional()
  .transform((value) => (value ? `${value}` : undefined));

const nullableCalendarDate = z.union([z.iso.date("Use a valid date."), z.literal("")]).transform((value) =>
  value ? value : null,
);

const optionalNullableCalendarDate = z
  .union([z.iso.date("Use a valid date."), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    return value;
  });

const optionalUuid = emptyToUndefined.pipe(z.uuid("Unknown user.").optional());

export const createIssueSchema = z
  .object({
    projectId: z.uuid("Unknown project."),
    type: z.enum(ISSUE_TYPES, { error: "Choose an issue type." }),
    parentId: emptyToUndefined.pipe(z.uuid("Unknown parent.").optional()),
    title: z.string().trim().min(1, "Title is required.").max(200, "Title must be 200 characters or fewer."),
    description: optionalText(8000),
    status: z.enum(ISSUE_STATUSES).optional(),
    priority: z.enum(ISSUE_PRIORITIES).optional(),
    assigneeId: optionalUuid,
    reporterId: optionalUuid,
    dueDate: optionalCalendarDate,
    plannedStartDate: optionalCalendarDate,
    labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    story: storyFieldsSchema.optional(),
    acceptanceCriteria: z.array(criterionTextSchema).max(40).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.type === "EPIC" && input.parentId) {
      ctx.addIssue({ code: "custom", path: ["parentId"], message: "Epics cannot have an issue parent." });
    }
    if (input.type !== "EPIC" && !input.parentId) {
      ctx.addIssue({ code: "custom", path: ["parentId"], message: "This issue type requires a parent." });
    }
    if (input.type === "USER_STORY" && !input.story) {
      ctx.addIssue({
        code: "custom",
        path: ["story"],
        message: "User Stories require As a, I want and So that.",
      });
    }
    if (input.type !== "USER_STORY" && input.story) {
      ctx.addIssue({ code: "custom", path: ["story"], message: "Only User Stories have story fields." });
    }
    if (input.type !== "USER_STORY" && input.acceptanceCriteria?.length) {
      ctx.addIssue({
        code: "custom",
        path: ["acceptanceCriteria"],
        message: "Acceptance criteria belong on User Stories.",
      });
    }
    const range = plannedRangeError(input.plannedStartDate, input.dueDate);
    if (range) ctx.addIssue({ code: "custom", path: ["plannedStartDate"], message: range });
  });

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const updateIssueSchema = z.object({
  issueId: z.uuid("Unknown issue."),
  title: z.string().trim().min(1, "Title is required.").max(200).optional(),
  description: z
    .string()
    .trim()
    .max(8000)
    .optional()
    .transform((value) => (value === undefined ? undefined : value.length === 0 ? null : value)),
  status: z.enum(ISSUE_STATUSES).optional(),
  priority: z.enum(ISSUE_PRIORITIES).optional(),
  assigneeId: z
    .union([z.uuid("Unknown user."), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "" || value === null ? null : value)),
  reporterId: z.uuid("Unknown user.").optional(),
  dueDate: optionalNullableCalendarDate,
  plannedStartDate: optionalNullableCalendarDate,
  parentId: z.uuid("Unknown parent.").optional(),
  type: z.enum(ISSUE_TYPES).optional(),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

export const issueIdSchema = z.object({ issueId: z.uuid("Unknown issue.") });

export const archiveIssueSchema = z.object({
  issueId: z.uuid("Unknown issue."),
  includeDescendants: z.boolean().optional(),
});

export const setStoryFieldsSchema = z.object({
  issueId: z.uuid("Unknown issue."),
  asA: storyFieldsSchema.shape.asA,
  iWant: storyFieldsSchema.shape.iWant,
  soThat: storyFieldsSchema.shape.soThat,
});

export const addCriterionSchema = z.object({
  issueId: z.uuid("Unknown issue."),
  text: criterionTextSchema,
});

export const updateCriterionSchema = z.object({
  criterionId: z.uuid("Unknown criterion."),
  text: criterionTextSchema.optional(),
  isMet: z.boolean().optional(),
});

export const moveCriterionSchema = z.object({
  criterionId: z.uuid("Unknown criterion."),
  direction: z.enum(["up", "down"]),
});

export const criterionIdSchema = z.object({
  criterionId: z.uuid("Unknown criterion."),
});

export const setIssueLabelsSchema = z.object({
  issueId: z.uuid("Unknown issue."),
  labels: z.array(z.string().trim().min(1).max(40)).max(20),
});

export const nullableCalendarDateSchema = nullableCalendarDate;
