/**
 * The fixed vocabulary of activity actions. New business mutations add their action here,
 * so every event in the database comes from a known, typed list.
 */
export const ACTIVITY_ACTIONS = [
  "project.created",
  "project.updated",
  "project.health_changed",
  "project.member_added",
  "issue.created",
  "issue.updated",
  "issue.completed",
  "issue.reopened",
  "issue.archived",
  "issue.restored",
  "issue.story_updated",
  "issue.labels_changed",
  "issue.criterion_added",
  "issue.criterion_updated",
  "issue.criterion_removed",
  "issue.criterion_met",
  "issue.criterion_unmet",
  "issue.criterion_reordered",
  "issue.criterion_restored",
  "issue.note_added",
  "issue.note_updated",
  "issue.note_removed",
  "issue.comment_added",
  "issue.comment_updated",
  "issue.comment_removed",
  "issue.attachment_added",
  "issue.attachment_removed",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_ENTITY_TYPES = [
  "project",
  "project_member",
  "issue",
  "acceptance_criterion",
  "issue_note",
  "issue_comment",
  "issue_attachment",
] as const;

export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

export type ActivityActor = { type: "USER"; userId: string } | { type: "SYSTEM" };

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };
