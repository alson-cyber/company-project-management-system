import { addCalendarDays, calendarDayUtc, parseCalendarDate } from "@/lib/calendar";
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
    definition: "Open work whose due date is before today in the company time zone. A Task with Sub-tasks is included when its own due date has passed.",
    usesDateRange: false,
  },
  {
    id: "priority",
    title: "Priority attention",
    definition: "Open work at High or Highest priority, including a Task that has Sub-tasks.",
    usesDateRange: false,
  },
  {
    id: "assignees",
    title: "Work by assignee",
    definition: "Open and done executable work grouped by the current assignee. Overdue counts every open issue with a due date before today. Alphabetical. This is not a ranking.",
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

const MAX_REPORT_RANGE_DAYS = 366;
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROJECT_KEY = /^[A-Z][A-Z0-9]{1,11}$/;

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  if (!value) return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function calendarOrNull(value: string | undefined): string | null {
  if (!value || !CALENDAR_DATE.test(value)) return null;
  const parsed = parseCalendarDate(value);
  if (Number.isNaN(parsed.getTime()) || calendarDayUtc(parsed) !== value) return null;
  return value;
}

function uuidOrNull(value: string | undefined): string | null {
  if (!value) return null;
  return UUID.test(value) ? value : null;
}

function projectKeyOrNull(value: string | undefined): string | null {
  const key = value?.trim().toUpperCase() ?? "";
  return PROJECT_KEY.test(key) ? key : null;
}

/** Keeps a custom window inside one year so a hostile range cannot expand a day-by-day series. */
function boundedRange(from: string, to: string): { from: string; to: string } {
  if (from > to) return { from: to, to };
  const span = parseCalendarDate(to).getTime() - parseCalendarDate(from).getTime();
  if (span > (MAX_REPORT_RANGE_DAYS - 1) * 86_400_000) {
    return { from: addCalendarDays(to, -(MAX_REPORT_RANGE_DAYS - 1)), to };
  }
  return { from, to };
}

export function parseReportFilters(input: Record<string, string | string[] | undefined>, today: string): ReportFilters {
  const read = (key: string) => {
    const value = input[key];
    return typeof value === "string" ? value : undefined;
  };
  const range = oneOf(read("range"), ["7", "30", "90", "custom"] as const) ?? "30";
  const customFrom = calendarOrNull(read("from"));
  const customTo = calendarOrNull(read("to"));
  const preset = range === "custom" ? "30" : range;
  const unclampedFrom = range === "custom" && customFrom ? customFrom : addCalendarDays(today, -(Number(preset) - 1));
  const unclampedTo = range === "custom" && customTo ? customTo : today;
  const bounded = boundedRange(unclampedFrom, unclampedTo);
  const issueKey = read("issue")?.trim().toUpperCase() || null;
  return {
    projectKey: projectKeyOrNull(read("project")),
    assigneeId: uuidOrNull(read("assignee")),
    status: oneOf(read("status"), ISSUE_STATUSES),
    priority: oneOf(read("priority"), ISSUE_PRIORITIES),
    issueType: oneOf(read("type"), ISSUE_TYPES),
    action: oneOf(read("action"), ACTIVITY_ACTIONS),
    actorId: uuidOrNull(read("actor")),
    range,
    from: bounded.from,
    to: bounded.to,
    cursor: read("cursor")?.slice(0, 80) || null,
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
