import type { IssuePriority, IssueStatus, IssueType, ProjectStatus } from "@/generated/prisma/enums";
import { ISSUE_STATUSES } from "@/modules/issues/issue.constants";
import { progressOfProject, type Progress, type ProgressIssue } from "@/modules/issues/issue.progress";

/**
 * One non-archived issue, already scoped to a single project.
 * Dates are calendar days (YYYY-MM-DD). createdAt is intentionally absent.
 */
export interface WorkspaceIssue {
  id: string;
  key: string;
  number: number;
  type: IssueType;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  parentId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  plannedStartDate: string | null;
  overdue: boolean;
  completedAt: string | null;
  completedById: string | null;
  createdById: string;
  labels: string[];
  progress: Progress;
}

export const BOARD_COLUMNS = ISSUE_STATUSES;

export type BoardGroupMode = "none" | "story" | "epic";

export interface BoardFilter {
  assigneeId: string;
  priority: IssuePriority | "";
  type: "TASK" | "SUB_TASK" | "";
  label: string;
}

export const EMPTY_BOARD_FILTER: BoardFilter = {
  assigneeId: "",
  priority: "",
  type: "",
  label: "",
};

export interface BoardCard {
  id: string;
  key: string;
  number: number;
  title: string;
  type: "TASK" | "SUB_TASK";
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  overdue: boolean;
  labels: string[];
  /** Immediate parent task title for a sub-task. */
  parentTitle: string | null;
  storyId: string | null;
  storyTitle: string | null;
  epicId: string | null;
  epicTitle: string | null;
}

export interface BoardGroup {
  id: string;
  title: string | null;
  cards: BoardCard[];
}

export function plannedRangeError(start: string | null | undefined, due: string | null | undefined): string | null {
  if (!start || !due) return null;
  if (start > due) return "Planned start must be on or before the due date.";
  return null;
}

function indexIssues(issues: readonly WorkspaceIssue[]): Map<string, WorkspaceIssue> {
  return new Map(issues.map((issue) => [issue.id, issue]));
}

function ancestorOfType(
  issue: WorkspaceIssue,
  type: IssueType,
  issues: Map<string, WorkspaceIssue>,
): WorkspaceIssue | null {
  let current: WorkspaceIssue | undefined = issue;
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    if (current.type === type) return current;
    seen.add(current.id);
    current = current.parentId ? issues.get(current.parentId) : undefined;
  }
  return null;
}

/** Tasks and sub-tasks only. Each issue becomes one card. */
export function boardCards(issues: readonly WorkspaceIssue[]): BoardCard[] {
  const index = indexIssues(issues);
  const cards: BoardCard[] = [];
  for (const issue of issues) {
    if (issue.type !== "TASK" && issue.type !== "SUB_TASK") continue;
    const parent = issue.parentId ? index.get(issue.parentId) : undefined;
    const story = ancestorOfType(issue, "USER_STORY", index);
    const epic = ancestorOfType(issue, "EPIC", index);
    cards.push({
      id: issue.id,
      key: issue.key,
      number: issue.number,
      title: issue.title,
      type: issue.type,
      status: issue.status,
      priority: issue.priority,
      assigneeId: issue.assigneeId,
      assigneeName: issue.assigneeName,
      dueDate: issue.dueDate,
      overdue: issue.overdue,
      labels: issue.labels,
      parentTitle: issue.type === "SUB_TASK" ? (parent?.title ?? null) : null,
      storyId: story?.id ?? null,
      storyTitle: story?.title ?? null,
      epicId: epic?.id ?? null,
      epicTitle: epic?.title ?? null,
    });
  }
  return cards;
}

export function filterBoardCards(cards: readonly BoardCard[], filter: BoardFilter): BoardCard[] {
  const label = filter.label.trim().toLowerCase();
  return cards.filter((card) => {
    const assigneeOk =
      !filter.assigneeId ||
      (filter.assigneeId === "unassigned" ? card.assigneeId === null : card.assigneeId === filter.assigneeId);
    const priorityOk = !filter.priority || card.priority === filter.priority;
    const typeOk = !filter.type || card.type === filter.type;
    const labelOk = !label || card.labels.some((name) => name.toLowerCase() === label);
    return assigneeOk && priorityOk && typeOk && labelOk;
  });
}

/** Each card is placed in exactly one group. */
export function groupBoardCards(cards: readonly BoardCard[], mode: BoardGroupMode): BoardGroup[] {
  if (mode === "none") return [{ id: "all", title: null, cards: [...cards] }];
  const groups = new Map<string, BoardGroup>();
  for (const card of cards) {
    const id = (mode === "story" ? card.storyId : card.epicId) ?? "ungrouped";
    const title = mode === "story" ? card.storyTitle : card.epicTitle;
    const existing = groups.get(id);
    if (existing) {
      existing.cards.push(card);
      continue;
    }
    groups.set(id, {
      id,
      title: title ?? (mode === "story" ? "No user story" : "No epic"),
      cards: [card],
    });
  }
  return [...groups.values()];
}

export interface AttentionItem {
  id: string;
  key: string;
  number: number;
  title: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  dueDate: string | null;
  assigneeName: string | null;
}

export interface TypeBreakdown {
  type: IssueType;
  open: number;
  done: number;
  total: number;
}

export interface OverviewSignals {
  progress: Progress;
  breakdown: TypeBreakdown[];
  overdue: AttentionItem[];
  highPriorityOpen: AttentionItem[];
  highestOpenCount: number;
  inReview: AttentionItem[];
  recentlyCompleted: AttentionItem[];
  dueSoon: AttentionItem[];
  targetApproaching: boolean;
  targetOverdue: boolean;
}

const TYPE_ORDER: IssueType[] = ["EPIC", "USER_STORY", "TASK", "SUB_TASK"];
const DUE_SOON_DAYS = 14;

export function addCalendarDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function toAttention(issue: WorkspaceIssue): AttentionItem {
  return {
    id: issue.id,
    key: issue.key,
    number: issue.number,
    title: issue.title,
    type: issue.type,
    status: issue.status,
    priority: issue.priority,
    dueDate: issue.dueDate,
    assigneeName: issue.assigneeName,
  };
}

export function typeBreakdown(issues: readonly WorkspaceIssue[]): TypeBreakdown[] {
  return TYPE_ORDER.map((type) => {
    const rows = issues.filter((issue) => issue.type === type);
    const done = rows.filter((issue) => issue.status === "DONE").length;
    return { type, open: rows.length - done, done, total: rows.length };
  });
}

/** Derived from the same executable-work rules as the issue hierarchy. */
export function overviewSignals(
  issues: readonly WorkspaceIssue[],
  options: { today: string; targetDate: string | null; projectStatus: ProjectStatus },
): OverviewSignals {
  const open = (issue: WorkspaceIssue) => issue.status !== "DONE";
  const soonLimit = addCalendarDays(options.today, DUE_SOON_DAYS);
  const highPriorityOpen = issues
    .filter((issue) => open(issue) && (issue.priority === "HIGH" || issue.priority === "HIGHEST"))
    .map(toAttention);
  const target = options.targetDate;
  const active = options.projectStatus !== "COMPLETED";
  const progressIssues: ProgressIssue[] = issues.map((issue) => ({
    id: issue.id,
    type: issue.type,
    parentId: issue.parentId,
    status: issue.status,
    archivedAt: null,
  }));

  return {
    progress: progressOfProject(progressIssues),
    breakdown: typeBreakdown(issues),
    overdue: issues.filter((issue) => issue.overdue).map(toAttention),
    highPriorityOpen,
    highestOpenCount: highPriorityOpen.filter((item) => item.priority === "HIGHEST").length,
    inReview: issues.filter((issue) => issue.status === "IN_REVIEW").map(toAttention),
    recentlyCompleted: [...issues]
      .filter((issue) => issue.status === "DONE")
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 6)
      .map(toAttention),
    dueSoon: issues
      .filter(
        (issue) =>
          open(issue) && issue.dueDate !== null && issue.dueDate >= options.today && issue.dueDate <= soonLimit && !issue.overdue,
      )
      .map(toAttention),
    targetApproaching: Boolean(target && active && target >= options.today && target <= soonLimit),
    targetOverdue: Boolean(target && active && target < options.today),
  };
}

export interface TimelineWindow {
  start: string;
  end: string;
  totalDays: number;
  months: Array<{ label: string; start: string; days: number }>;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function calendarDayDiff(later: string, earlier: string): number {
  const end = Date.parse(`${later}T00:00:00.000Z`);
  const start = Date.parse(`${earlier}T00:00:00.000Z`);
  return Math.round((end - start) / 86_400_000);
}

function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

function endOfMonth(day: string): string {
  const [year, month] = day.split("-").map(Number);
  const last = new Date(Date.UTC(year ?? 1970, month ?? 1, 0)).getUTCDate();
  return `${day.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

function monthSpan(start: string, end: string): number {
  const [startYear, startMonth] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  return (endYear! - startYear!) * 12 + (endMonth! - startMonth!) + 1;
}

/**
 * Month window covering every planned date, today, and the project target.
 * Day geometry is shared so a later week or quarter scale can reuse it.
 */
export function timelineWindow(dates: readonly string[], targetDate: string | null, today: string): TimelineWindow {
  const points = dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
  points.push(today);
  if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) points.push(targetDate);
  const min = points.reduce((left, right) => (left < right ? left : right));
  const max = points.reduce((left, right) => (left > right ? left : right));
  const start = startOfMonth(min);
  let end = endOfMonth(max);
  while (monthSpan(start, end) < 3) end = endOfMonth(addCalendarDays(end, 1));

  const totalDays = calendarDayDiff(end, start) + 1;
  const months: TimelineWindow["months"] = [];
  let cursor = start;
  while (cursor <= end) {
    const monthEnd = endOfMonth(cursor);
    const clampedEnd = monthEnd < end ? monthEnd : end;
    const [year, month] = cursor.split("-").map(Number);
    months.push({
      label: `${MONTHS[(month ?? 1) - 1]} ${year}`,
      start: cursor,
      days: calendarDayDiff(clampedEnd, cursor) + 1,
    });
    cursor = addCalendarDays(clampedEnd, 1);
  }
  return { start, end, totalDays, months };
}

export type TimelineMark = { kind: "bar"; left: number; width: number } | { kind: "point"; left: number; label: "Start" | "Due" };

/** A bar needs both plan dates. A single date is a marker. Missing dates produce nothing. */
export function timelineMark(
  issue: Pick<WorkspaceIssue, "plannedStartDate" | "dueDate">,
  window: Pick<TimelineWindow, "start" | "end" | "totalDays">,
): TimelineMark | null {
  const start = issue.plannedStartDate;
  const due = issue.dueDate;
  if (!start && !due) return null;
  const place = (day: string) => (calendarDayDiff(day, window.start) / window.totalDays) * 100;

  if (start && due) {
    const barStart = start < window.start ? window.start : start;
    const barEnd = due > window.end ? window.end : due;
    if (barEnd < window.start || barStart > window.end) return null;
    const left = place(barStart);
    const width = ((calendarDayDiff(barEnd, barStart) + 1) / window.totalDays) * 100;
    return { kind: "bar", left, width };
  }

  const day = due ?? start;
  if (!day || day < window.start || day > window.end) return null;
  return { kind: "point", left: place(day), label: due ? "Due" : "Start" };
}

export function markerLeft(day: string | null, window: Pick<TimelineWindow, "start" | "end" | "totalDays">): number | null {
  if (!day || day < window.start || day > window.end) return null;
  return (calendarDayDiff(day, window.start) / window.totalDays) * 100;
}

export interface TimelineRow {
  issue: WorkspaceIssue;
  depth: number;
  hasChildren: boolean;
}

export function timelineRows(issues: readonly WorkspaceIssue[]): TimelineRow[] {
  const children = new Map<string | null, WorkspaceIssue[]>();
  for (const issue of issues) {
    const list = children.get(issue.parentId) ?? [];
    list.push(issue);
    children.set(issue.parentId, list);
  }
  const rows: TimelineRow[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const issue of children.get(parentId) ?? []) {
      const kids = children.get(issue.id) ?? [];
      rows.push({ issue, depth, hasChildren: kids.length > 0 });
      walk(issue.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

export function visibleTimelineRows(rows: readonly TimelineRow[], collapsedIds: ReadonlySet<string>): TimelineRow[] {
  const visible: TimelineRow[] = [];
  let hiddenBelow: number | null = null;
  for (const row of rows) {
    if (hiddenBelow !== null) {
      if (row.depth > hiddenBelow) continue;
      hiddenBelow = null;
    }
    visible.push(row);
    if (collapsedIds.has(row.issue.id)) hiddenBelow = row.depth;
  }
  return visible;
}

export interface MemberFacts {
  openAssigned: AttentionItem[];
  overdueAssigned: AttentionItem[];
  /** Completion stays with completedBy, even if the issue is later reassigned. */
  completed: AttentionItem[];
  created: AttentionItem[];
}

export function memberFacts(userId: string, issues: readonly WorkspaceIssue[]): MemberFacts {
  const assignedOpen = issues.filter((issue) => issue.assigneeId === userId && issue.status !== "DONE");
  return {
    openAssigned: assignedOpen.map(toAttention),
    overdueAssigned: assignedOpen.filter((issue) => issue.overdue).map(toAttention),
    completed: issues
      .filter((issue) => issue.completedById === userId)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .map(toAttention),
    created: issues.filter((issue) => issue.createdById === userId).map(toAttention),
  };
}

export type AttachmentKind = "image" | "pdf" | "text" | "other";

export function attachmentKind(contentType: string): AttachmentKind {
  if (contentType.startsWith("image/")) return "image";
  if (contentType === "application/pdf") return "pdf";
  if (contentType.startsWith("text/")) return "text";
  return "other";
}

const PREVIEWABLE = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function canPreviewAttachment(contentType: string): boolean {
  return PREVIEWABLE.has(contentType);
}
