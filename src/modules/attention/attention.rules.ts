import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";
import {
  COMPLETED_RECENT_DAYS,
  PERSONAL_DUE_SOON_DAYS,
  RECENTLY_UPDATED_DAYS,
  calendarDayUtc,
  isDueSoon,
  isOverdue,
  parseCalendarDate,
  recentWindowStart,
} from "@/lib/calendar";
import { ISSUE_STATUS_LABELS } from "@/modules/issues/issue.constants";

export const MY_WORK_VIEWS = ["assigned", "progress", "review", "soon", "overdue", "updated", "completed"] as const;
export type MyWorkView = (typeof MY_WORK_VIEWS)[number];

export const MY_WORK_SORTS = ["due", "updated", "priority"] as const;
export type MyWorkSort = (typeof MY_WORK_SORTS)[number];

export const DUE_STATES = ["", "overdue", "soon", "later", "none"] as const;
export type DueState = (typeof DUE_STATES)[number];

export interface MyWorkIssue {
  id: string;
  key: string;
  number: number;
  title: string;
  projectId: string;
  projectKey: string;
  projectName: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  dueDate: string | null;
  updatedAt: string;
  assigneeId: string | null;
  completedById: string | null;
  completedAt: string | null;
  context: string | null;
}

export interface MyWorkQuery {
  view: MyWorkView;
  projectId: string;
  status: string;
  type: string;
  priority: string;
  due: DueState;
  sort: MyWorkSort;
}

const PRIORITY_RANK: Record<IssuePriority, number> = {
  HIGHEST: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  LOWEST: 4,
};

export function isMyWorkView(value: string): value is MyWorkView {
  return (MY_WORK_VIEWS as readonly string[]).includes(value);
}

export function isMyWorkSort(value: string): value is MyWorkSort {
  return (MY_WORK_SORTS as readonly string[]).includes(value);
}

export function isDueState(value: string): value is DueState {
  return (DUE_STATES as readonly string[]).includes(value);
}

function openAssigned(issue: MyWorkIssue, viewerId: string): boolean {
  return issue.assigneeId === viewerId && issue.status !== "DONE";
}

function completedByViewer(issue: MyWorkIssue, viewerId: string, timeZone: string, at: Date): boolean {
  if (issue.completedById !== viewerId || !issue.completedAt) return false;
  return issue.completedAt >= recentWindowStart(timeZone, COMPLETED_RECENT_DAYS, at).toISOString();
}

export function matchesView(issue: MyWorkIssue, view: MyWorkView, viewerId: string, timeZone: string, at: Date): boolean {
  const due = issue.dueDate ? parseCalendarDate(issue.dueDate) : null;
  switch (view) {
    case "assigned":
      return openAssigned(issue, viewerId);
    case "progress":
      return openAssigned(issue, viewerId) && issue.status === "IN_PROGRESS";
    case "review":
      return openAssigned(issue, viewerId) && issue.status === "IN_REVIEW";
    case "soon":
      return openAssigned(issue, viewerId) && isDueSoon(due, issue.status, timeZone, at);
    case "overdue":
      return openAssigned(issue, viewerId) && isOverdue(due, issue.status, timeZone, at);
    case "updated": {
      if (!openAssigned(issue, viewerId)) return false;
      const start = recentWindowStart(timeZone, RECENTLY_UPDATED_DAYS, at).toISOString();
      return issue.updatedAt >= start;
    }
    case "completed":
      return completedByViewer(issue, viewerId, timeZone, at);
  }
}

function matchesDue(issue: MyWorkIssue, due: DueState, timeZone: string, at: Date): boolean {
  if (!due) return true;
  const date = issue.dueDate ? parseCalendarDate(issue.dueDate) : null;
  const overdue = isOverdue(date, issue.status, timeZone, at);
  const soon = isDueSoon(date, issue.status, timeZone, at);
  if (due === "overdue") return overdue;
  if (due === "soon") return soon;
  if (due === "none") return issue.dueDate === null;
  return issue.dueDate !== null && !overdue && !soon;
}

export function filterMyWork(issues: MyWorkIssue[], viewerId: string, query: MyWorkQuery, timeZone: string, at: Date = new Date()): MyWorkIssue[] {
  const filtered = issues.filter((issue) => {
    if (query.projectId && issue.projectId !== query.projectId) return false;
    if (query.type && issue.type !== query.type) return false;
    if (query.priority && issue.priority !== query.priority) return false;
    if (query.status && issue.status !== query.status) return false;
    if (!matchesDue(issue, query.due, timeZone, at)) return false;
    return matchesView(issue, query.view, viewerId, timeZone, at);
  });
  const sorted = filtered.slice();
  sorted.sort((a, b) => compareMyWork(a, b, query.sort));
  return sorted;
}

function compareMyWork(a: MyWorkIssue, b: MyWorkIssue, sort: MyWorkSort): number {
  if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
  if (sort === "priority") {
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rank !== 0) return rank;
  }
  if (a.dueDate === b.dueDate) return b.updatedAt.localeCompare(a.updatedAt);
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return a.dueDate.localeCompare(b.dueDate);
}

export function countMyWorkViews(
  issues: MyWorkIssue[],
  viewerId: string,
  query: Omit<MyWorkQuery, "view" | "sort">,
  timeZone: string,
  at: Date = new Date(),
): Record<MyWorkView, number> {
  const counts = {} as Record<MyWorkView, number>;
  for (const view of MY_WORK_VIEWS) {
    counts[view] = filterMyWork(issues, viewerId, { ...query, view, sort: "due" }, timeZone, at).length;
  }
  return counts;
}

export const ATTENTION_TYPES = [
  "ISSUE_ASSIGNED",
  "ISSUE_COMMENTED",
  "ISSUE_NOTE_ADDED",
  "ISSUE_STATUS_CHANGED",
  "ISSUE_DUE_SOON",
  "ISSUE_OVERDUE",
  "PROJECT_MEMBERSHIP",
] as const;

export type AttentionType = (typeof ATTENTION_TYPES)[number];

export interface AttentionMetadata {
  fromStatus?: string;
  toStatus?: string;
  excerpt?: string;
  role?: string;
  dueDate?: string;
}

/** The actor is not notified about their own change. Date alerts have no actor. */
export function attentionRecipient(actorId: string | null, recipientId: string): boolean {
  return actorId === null || actorId !== recipientId;
}

export function assignmentDedupe(issueId: string, activityId: string): string {
  return `assign:${issueId}:${activityId}`;
}

export function statusDedupe(issueId: string, activityId: string): string {
  return `status:${issueId}:${activityId}`;
}

export function discussionDedupe(kind: "comment" | "note", entityId: string): string {
  return `${kind}:${entityId}`;
}

export function membershipDedupe(projectId: string, userId: string, activityId: string): string {
  return `member:${projectId}:${userId}:${activityId}`;
}

export function dateDedupe(kind: "overdue" | "due_soon", issueId: string, dueDate: string): string {
  return `${kind}:${issueId}:${dueDate}`;
}

function statusLabel(value: string | undefined): string {
  if (!value) return "another status";
  return value in ISSUE_STATUS_LABELS ? ISSUE_STATUS_LABELS[value as IssueStatus] : value;
}

/** Sentence rendered from the stored event. It does not re-read current issue status. */
export function describeAttention(input: {
  type: AttentionType;
  actorName: string | null;
  issueKey: string | null;
  projectName: string | null;
  metadata: AttentionMetadata;
}): string {
  const actor = input.actorName ?? "Someone";
  const key = input.issueKey ?? "an issue";
  switch (input.type) {
    case "ISSUE_ASSIGNED":
      return `${actor} assigned ${key} to you`;
    case "ISSUE_COMMENTED":
      return `${actor} commented on ${key}`;
    case "ISSUE_NOTE_ADDED":
      return `${actor} added a note on ${key}`;
    case "ISSUE_STATUS_CHANGED":
      return `${actor} moved ${key} from ${statusLabel(input.metadata.fromStatus)} to ${statusLabel(input.metadata.toStatus)}`;
    case "ISSUE_DUE_SOON":
      return `${key} is due ${input.metadata.dueDate ?? "soon"}`;
    case "ISSUE_OVERDUE":
      return `${key} is overdue`;
    case "PROJECT_MEMBERSHIP":
      return `${actor} added you to ${input.projectName ?? "a project"}${input.metadata.role === "LEAD" ? " as project lead" : ""}`;
  }
}

export function dueDateForAttention(dueDate: Date | null, status: IssueStatus, timeZone: string, at: Date = new Date()): "overdue" | "due_soon" | null {
  if (isOverdue(dueDate, status, timeZone, at)) return "overdue";
  if (isDueSoon(dueDate, status, timeZone, at)) return "due_soon";
  return null;
}

export function attentionDueDay(dueDate: Date): string {
  return calendarDayUtc(dueDate);
}

export { COMPLETED_RECENT_DAYS, PERSONAL_DUE_SOON_DAYS, RECENTLY_UPDATED_DAYS };
