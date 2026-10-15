import { z } from "zod";
import { PROJECT_COLORS, PROJECT_HEALTH_STATES, PROJECT_STATUSES } from "@/modules/projects/project.constants";

/** Mirrors the projects_key_format CHECK constraint in the initial migration. */
export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

export const projectKeySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(PROJECT_KEY_PATTERN, "Use 2–10 letters or digits, starting with a letter (for example AQUA or PMS).");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalDate = z
  .union([z.iso.date("Use a valid date."), z.literal("")])
  .optional()
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined));

export const createProjectSchema = z.object({
  key: projectKeySchema,
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name must be 80 characters or fewer."),
  description: optionalText(2000),
  status: z.enum(PROJECT_STATUSES).default("PLANNING"),
  targetDate: optionalDate,
  leadUserId: z.string().min(1, "Choose a project lead."),
  color: z.enum(PROJECT_COLORS).optional(),
});

export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const setProjectHealthSchema = z.object({
  projectId: z.uuid("Unknown project."),
  health: z.enum(PROJECT_HEALTH_STATES, { error: "Choose a health state." }),
  note: optionalText(500),
});

export type SetProjectHealthInput = z.input<typeof setProjectHealthSchema>;

const nullableDate = z.union([z.iso.date("Use a valid date."), z.literal(""), z.null()]).transform((value) => {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
});

/**
 * Basics a project lead can change. The project key is immutable: issue keys are
 * `KEY-number`, so renaming the key would rewrite every existing reference.
 */
export const updateProjectSchema = z.object({
  projectId: z.uuid("Unknown project."),
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80, "Name must be 80 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2,000 characters or fewer.")
    .transform((value) => (value.length === 0 ? null : value)),
  status: z.enum(PROJECT_STATUSES, { error: "Choose a project status." }),
  targetDate: nullableDate,
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
