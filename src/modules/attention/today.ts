import { filterMyWork, type MyWorkIssue, type MyWorkView } from "@/modules/attention/attention.rules";

export type TodayReason = "overdue" | "soon" | "progress" | "review";

export interface TodayItem {
  issue: MyWorkIssue;
  reason: TodayReason;
}

export interface TodaySummary {
  overdue: number;
  dueSoon: number;
  inProgress: number;
  inReview: number;
  completedRecently: number;
}

const ORDER: ReadonlyArray<{ reason: TodayReason; view: MyWorkView }> = [
  { reason: "overdue", view: "overdue" },
  { reason: "soon", view: "soon" },
  { reason: "progress", view: "progress" },
  { reason: "review", view: "review" },
];

const NO_FILTERS = { projectId: "", status: "", type: "", priority: "", due: "" as const };

/**
 * The handful of things that matter most right now, in this order: overdue work,
 * work due soon, work in progress, then work waiting in review. Each issue appears once.
 * Uses the same My Work rules, so the dashboard never disagrees with My Work.
 */
export function todayFocus(
  issues: MyWorkIssue[],
  viewerId: string,
  timeZone: string,
  limit = 5,
  at: Date = new Date(),
): TodayItem[] {
  const seen = new Set<string>();
  const items: TodayItem[] = [];
  for (const { reason, view } of ORDER) {
    const sort = view === "progress" || view === "review" ? "priority" : "due";
    for (const issue of filterMyWork(issues, viewerId, { ...NO_FILTERS, view, sort }, timeZone, at)) {
      if (seen.has(issue.id)) continue;
      seen.add(issue.id);
      items.push({ issue, reason });
      if (items.length >= limit) return items;
    }
  }
  return items;
}

export function todaySummary(
  issues: MyWorkIssue[],
  viewerId: string,
  timeZone: string,
  at: Date = new Date(),
): TodaySummary {
  const count = (view: MyWorkView) =>
    filterMyWork(issues, viewerId, { ...NO_FILTERS, view, sort: "due" }, timeZone, at).length;
  return {
    overdue: count("overdue"),
    dueSoon: count("soon"),
    inProgress: count("progress"),
    inReview: count("review"),
    completedRecently: count("completed"),
  };
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** One friendly sentence, for example "2 tasks overdue, 1 due soon and 1 in review." */
export function describeToday(summary: TodaySummary): string {
  const parts: string[] = [];
  if (summary.overdue) parts.push(`${plural(summary.overdue, "item", "items")} overdue`);
  if (summary.dueSoon) parts.push(`${summary.dueSoon} due soon`);
  if (summary.inProgress) parts.push(`${summary.inProgress} in progress`);
  if (summary.inReview) parts.push(`${summary.inReview} in review`);
  if (parts.length === 0) {
    return summary.completedRecently
      ? `You're all caught up, with ${plural(summary.completedRecently, "item", "items")} finished in the last 14 days.`
      : "You're all caught up. Nothing assigned to you needs attention.";
  }
  const last = parts.pop();
  return `${parts.length ? `${parts.join(", ")} and ${last}` : last}.`.replace(/^./, (first) =>
    first.toUpperCase(),
  );
}
