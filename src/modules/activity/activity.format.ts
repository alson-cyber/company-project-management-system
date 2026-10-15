import { ISSUE_PRIORITY_LABELS, ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS } from "@/modules/issues/issue.constants";
import { PROJECT_HEALTH_LABELS, PROJECT_ROLE_LABELS } from "@/modules/projects/project.constants";
import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";

export interface ActivityEventView {
  id: string;
  occurredAt: Date;
  action: string;
  actorName: string | null;
  before: unknown;
  after: unknown;
}

function field(value: unknown, key: string): unknown {
  return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : undefined;
}

function healthLabel(value: unknown): string {
  return typeof value === "string" && value in PROJECT_HEALTH_LABELS
    ? PROJECT_HEALTH_LABELS[value as keyof typeof PROJECT_HEALTH_LABELS]
    : "Not set";
}

function changedFields(event: ActivityEventView): string[] {
  if (!event.after || typeof event.after !== "object") return [];
  return Object.keys(event.after as object).filter((name) => name !== "assigneeName");
}

function personLabel(value: unknown): string {
  return typeof value === "string" && value.trim() ? value : "Unassigned";
}

function textOf(value: unknown, key: string): string | null {
  const found = field(value, key);
  return typeof found === "string" && found.trim() ? found : null;
}

function statusLabel(value: unknown): string {
  return typeof value === "string" && value in ISSUE_STATUS_LABELS
    ? ISSUE_STATUS_LABELS[value as IssueStatus]
    : String(value ?? "");
}

function priorityLabel(value: unknown): string {
  return typeof value === "string" && value in ISSUE_PRIORITY_LABELS
    ? ISSUE_PRIORITY_LABELS[value as IssuePriority]
    : String(value ?? "");
}

function typeLabel(value: unknown): string {
  return typeof value === "string" && value in ISSUE_TYPE_LABELS ? ISSUE_TYPE_LABELS[value as IssueType] : String(value ?? "");
}

/** Human-readable sentence rendered from structured event data at read time. */
export function describeActivity(event: ActivityEventView): string {
  switch (event.action) {
    case "project.created":
      return `created the project`;
    case "project.health_changed":
      return `changed health from ${healthLabel(field(event.before, "health"))} to ${healthLabel(field(event.after, "health"))}`;
    case "project.member_added": {
      const role = field(event.after, "role");
      const label =
        typeof role === "string" && role in PROJECT_ROLE_LABELS
          ? PROJECT_ROLE_LABELS[role as keyof typeof PROJECT_ROLE_LABELS]
          : "member";
      return `added a ${label.toLowerCase()}`;
    }
    case "issue.created":
      return `created ${typeLabel(field(event.after, "type"))} ${String(field(event.after, "key") ?? "")}`.trim();
    case "issue.updated": {
      const fields = changedFields(event);
      if (fields.length === 1 && fields[0] === "status") {
        return `changed status from ${statusLabel(field(event.before, "status"))} to ${statusLabel(field(event.after, "status"))}`;
      }
      if (fields.length === 1 && fields[0] === "priority") {
        return `changed priority from ${priorityLabel(field(event.before, "priority"))} to ${priorityLabel(field(event.after, "priority"))}`;
      }
      if (fields.length === 1 && fields[0] === "assigneeId") {
        const from = field(event.before, "assigneeName");
        const to = field(event.after, "assigneeName");
        if (from !== undefined || to !== undefined) {
          return `changed the assignee from ${personLabel(from)} to ${personLabel(to)}`;
        }
        return "changed the assignee";
      }
      if (fields.length === 1 && fields[0] === "dueDate") return "changed the due date";
      if (fields.length === 1 && fields[0] === "parentId") return "moved the issue";
      if (fields.length === 1 && fields[0] === "title") return "edited the title";
      if (fields.length === 1 && fields[0] === "description") return "edited the description";
      return `updated ${fields.join(", ") || "the issue"}`;
    }
    case "issue.completed":
      return "completed the issue";
    case "issue.reopened":
      return "reopened the issue";
    case "issue.archived":
      return "archived the issue";
    case "issue.restored":
      return "restored the issue";
    case "issue.story_updated":
      return "updated the user story";
    case "issue.labels_changed":
      return "changed labels";
    case "issue.criterion_added":
      return "added an acceptance criterion";
    case "issue.criterion_updated":
      return "edited an acceptance criterion";
    case "issue.criterion_removed":
      return "removed an acceptance criterion";
    case "issue.criterion_met":
      return "marked an acceptance criterion as met";
    case "issue.criterion_unmet":
      return "marked an acceptance criterion as not met";
    case "issue.criterion_reordered":
      return "reordered an acceptance criterion";
    case "issue.criterion_restored":
      return "restored an acceptance criterion";
    case "issue.note_added":
      return "added a note";
    case "issue.note_updated":
      return "edited a note";
    case "issue.note_removed":
      return "removed a note";
    case "issue.comment_added":
      return "added a comment";
    case "issue.comment_updated":
      return "edited a comment";
    case "issue.comment_removed":
      return "removed a comment";
    case "issue.attachment_added": {
      const name = textOf(event.after, "filename");
      return name ? `uploaded ${name}` : "uploaded an attachment";
    }
    case "issue.attachment_removed": {
      const name = textOf(event.before, "filename");
      return name ? `removed ${name}` : "removed an attachment";
    }
    default:
      return event.action;
  }
}

/** A short before/after line for the issue activity list. Null when the sentence already says enough. */
export function activityDetail(event: ActivityEventView): string | null {
  switch (event.action) {
    case "issue.updated": {
      const fields = changedFields(event);
      if (fields.length === 1 && fields[0] === "status") {
        return `${statusLabel(field(event.before, "status"))} → ${statusLabel(field(event.after, "status"))}`;
      }
      if (fields.length === 1 && fields[0] === "priority") {
        return `${priorityLabel(field(event.before, "priority"))} → ${priorityLabel(field(event.after, "priority"))}`;
      }
      if (fields.length === 1 && fields[0] === "assigneeId") {
        const from = field(event.before, "assigneeName");
        const to = field(event.after, "assigneeName");
        if (from === undefined && to === undefined) return null;
        return `${personLabel(from)} → ${personLabel(to)}`;
      }
      if (fields.length === 1 && fields[0] === "dueDate") {
        const from = field(event.before, "dueDate");
        const to = field(event.after, "dueDate");
        return `${typeof from === "string" ? from : "None"} → ${typeof to === "string" ? to : "None"}`;
      }
      return null;
    }
    case "issue.note_added":
    case "issue.note_updated":
    case "issue.comment_added":
    case "issue.comment_updated":
      return textOf(event.after, "excerpt");
    case "issue.note_removed":
    case "issue.comment_removed":
      return textOf(event.before, "excerpt");
    case "issue.criterion_added":
    case "issue.criterion_updated":
    case "issue.criterion_restored":
    case "issue.criterion_met":
    case "issue.criterion_unmet":
      return textOf(event.after, "text") ?? textOf(event.before, "text");
    case "issue.criterion_removed":
      return textOf(event.before, "text");
    default:
      return null;
  }
}

/** Quiet category label for an event. Wording, not color, carries the type. */
export function activityKind(event: ActivityEventView): string {
  if (event.action === "issue.updated") {
    const fields = changedFields(event);
    if (fields.length === 1 && fields[0] === "status") return "Status";
    if (fields.length === 1 && fields[0] === "priority") return "Priority";
    if (fields.length === 1 && fields[0] === "assigneeId") return "Person";
    if (fields.length === 1 && fields[0] === "dueDate") return "Date";
    if (fields.length === 1 && fields[0] === "title") return "Title";
    if (fields.length === 1 && fields[0] === "description") return "Description";
    return "Issue";
  }
  if (event.action.includes("note")) return "Note";
  if (event.action.includes("comment")) return "Comment";
  if (event.action.includes("attachment")) return "File";
  if (event.action.includes("criterion") || event.action.includes("story")) return "Story";
  if (event.action.includes("label")) return "Labels";
  if (event.action === "issue.completed" || event.action === "issue.reopened") return "Status";
  if (event.action.startsWith("project.")) return "Project";
  return "Issue";
}
