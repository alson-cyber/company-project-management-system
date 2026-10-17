import { addCalendarDays } from "@/lib/calendar";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES } from "@/modules/issues/issue.constants";
import { ACTIVITY_ACTIONS, type ActivityAction } from "@/modules/activity/activity.types";
import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";

export const REPORT_IDS = [
  "progress",
  "status",
  "overdue",
  "priority",
  "assignees",
  "completions",
  "activity",
  "types",
] as const;

export type ReportId = (typeof REPORT_IDS)[number];

export interface ReportDefinition {
  id: ReportId;
  title: string;
  definition: string;
  usesDateRange: boolean;
}

export const REPORTS: ReportDefinition[] = [
  {
    id: "progress",
    title: "Project progress",
    definition: "Derived progress of executable work, open and done counts, target date and the lead-set health label.",
    usesDateRange: false,
  },
  {
    id: "status",
    title: "Work by status",
    definition: "Executable work counted in To Do, In Progress, In Review and Done. Epics and User Stories are not included.",
    usesDateRange: false,
  },
  {
    id: "overdue",
    title: "Overdue work",
    definition: "Open executable work whose due date is before today in the company time zone.",
    usesDateRange: false,
  },
  {
    id: "priority",
    title: "Priority attention",
    definition: "Open executable work at High or Highest priority.",
    usesDateRange: false,
  },
  {
    id: "assignees",
    title: "Work by assignee",
    definition: "Open and done executable work grouped by the current assignee. Alphabetical. This is not a ranking.",
    usesDateRange: false,
  },
  {
    id: "completions",
    title: "Completion trend",
    definition: "issue.completed events per company calendar day. Credit stays with the person who moved the work to Done.",
    usesDateRange: true,
  },
  {
    id: "activity",
    title: "Activity",
    definition: "Append-only audit events in the selected window, limited to projects the viewer can see.",
    usesDateRange: true,
  },
  {
    id: "types",
    title: "Issue type distribution",
    definition: "Non-archived issues by type: Epic, User Story, Task and Sub-task.",
    usesDateRange: false,
  },
];

export function isReportId(value: string): value is ReportId {
  return (REPORT_IDS as readonly string[]).includes(value);
}

export interface ReportFilters {
  projectKey: string | null;
  assigneeId: string | null;
  status: IssueStatus | null;
  priority: IssuePriority | null;
  issueType: IssueType | null;
  action: ActivityAction | null;
  actorId: string | null;
  range: "7" | "30" | "90" | "custom";
  from: string;
  to: string;
  cursor: string | null;
  issueKey: string | null;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  if (!value) return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function parseReportFilters(input: Record<string, string | string[] | undefined>, today: string): ReportFilters {
  const read = (key: string) => {
    const value = input[key];
    return typeof value === "string" ? value : undefined;
  };
  const range = oneOf(read("range"), ["7", "30", "90", "custom"] as const) ?? "30";
  const customFrom = read("from");
  const customTo = read("to");
  const from = range === "custom" && customFrom ? customFrom : addCalendarDays(today, -(Number(range === "custom" ? "30" : range) - 1));
  const to = range === "custom" && customTo ? customTo : today;
  const issueKey = read("issue")?.trim().toUpperCase() || null;
  return {
    projectKey: read("project")?.trim().toUpperCase() || null,
    assigneeId: read("assignee") || null,
    status: oneOf(read("status"), ISSUE_STATUSES),
    priority: oneOf(read("priority"), ISSUE_PRIORITIES),
    issueType: oneOf(read("type"), ISSUE_TYPES),
    action: oneOf(read("action"), ACTIVITY_ACTIONS),
    actorId: read("actor") || null,
    range,
    from,
    to,
    cursor: read("cursor") || null,
    issueKey: issueKey && /^[A-Z][A-Z0-9]+-\d+$/.test(issueKey) ? issueKey : null,
  };
}

export function reportQuery(filters: ReportFilters, extra: Record<string, string | null> = {}): string {
  const params = new URLSearchParams();
  const values: Record<string, string | null> = {
    project: filters.projectKey,
    assignee: filters.assigneeId,
    status: filters.status,
    priority: filters.priority,
    type: filters.issueType,
    action: filters.action,
    actor: filters.actorId,
    range: filters.range,
    from: filters.range === "custom" ? filters.from : null,
    to: filters.range === "custom" ? filters.to : null,
    issue: filters.issueKey,
    cursor: filters.cursor,
    ...extra,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
