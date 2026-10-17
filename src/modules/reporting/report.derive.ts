import { isOverdue, todayInTimeZone } from "@/lib/calendar";
import { calendarDayDiff } from "@/modules/projects/workspace.model";
import { ISSUE_STATUSES, ISSUE_TYPES } from "@/modules/issues/issue.constants";
import { isExecutable, type ProgressIssue } from "@/modules/issues/issue.progress";
import type { IssueFact, PortfolioProject } from "@/modules/reporting/portfolio.derive";
import type { ReportFilters } from "@/modules/reporting/reports.model";
import type { IssueStatus, IssueType } from "@/generated/prisma/enums";

function node(issue: IssueFact): ProgressIssue {
  return { id: issue.id, parentId: issue.parentId, type: issue.type, status: issue.status, archivedAt: null };
}

export function executableFacts(issues: IssueFact[]): IssueFact[] {
  const nodes = issues.map(node);
  return issues.filter((issue) => isExecutable(node(issue), nodes));
}

export function applyIssueFilters(issues: IssueFact[], projects: PortfolioProject[], filters: ReportFilters): IssueFact[] {
  const projectId = filters.projectKey ? projects.find((project) => project.key === filters.projectKey)?.id : undefined;
  return issues.filter((issue) => {
    if (filters.projectKey && issue.projectId !== projectId) return false;
    if (filters.assigneeId && issue.assigneeId !== filters.assigneeId) return false;
    if (filters.status && issue.status !== filters.status) return false;
    if (filters.priority && issue.priority !== filters.priority) return false;
    if (filters.issueType && issue.type !== filters.issueType) return false;
    return true;
  });
}

export interface OverdueRow {
  id: string;
  key: string;
  title: string;
  projectKey: string;
  projectName: string;
  assigneeName: string | null;
  priority: string;
  dueDate: string;
  overdueDays: number;
  status: IssueStatus;
}

export function overdueRows(
  issues: IssueFact[],
  projects: PortfolioProject[],
  timeZone: string,
  at: Date = new Date(),
): OverdueRow[] {
  const today = todayInTimeZone(timeZone, at);
  const byId = new Map(projects.map((project) => [project.id, project]));
  return executableFacts(issues)
    .filter((issue) => issue.dueDate && isOverdue(new Date(`${issue.dueDate}T00:00:00.000Z`), issue.status, timeZone, at))
    .map((issue) => {
      const project = byId.get(issue.projectId);
      return {
        id: issue.id,
        key: `${project?.key ?? ""}-${issue.number}`,
        title: issue.title,
        projectKey: project?.key ?? "",
        projectName: project?.name ?? "",
        assigneeName: issue.assigneeName,
        priority: issue.priority,
        dueDate: issue.dueDate ?? "",
        overdueDays: issue.dueDate ? calendarDayDiff(today, issue.dueDate) : 0,
        status: issue.status,
      };
    })
    .sort((a, b) => b.overdueDays - a.overdueDays || a.key.localeCompare(b.key));
}

export function statusCounts(issues: IssueFact[]): Record<IssueStatus, number> {
  const counts = { TO_DO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 } satisfies Record<IssueStatus, number>;
  for (const issue of executableFacts(issues)) counts[issue.status] += 1;
  return counts;
}

export function typeCounts(issues: IssueFact[]): Record<IssueType, number> {
  const counts = { EPIC: 0, USER_STORY: 0, TASK: 0, SUB_TASK: 0 } satisfies Record<IssueType, number>;
  for (const issue of issues) counts[issue.type] += 1;
  return counts;
}

export interface AssigneeRow {
  assigneeId: string | null;
  name: string;
  open: number;
  inReview: number;
  done: number;
  overdue: number;
}

export function assigneeRows(issues: IssueFact[], timeZone: string, at: Date = new Date()): AssigneeRow[] {
  const rows = new Map<string, AssigneeRow>();
  for (const issue of executableFacts(issues)) {
    const key = issue.assigneeId ?? "";
    const row = rows.get(key) ?? {
      assigneeId: issue.assigneeId,
      name: issue.assigneeName ?? "Unassigned",
      open: 0,
      inReview: 0,
      done: 0,
      overdue: 0,
    };
    if (issue.status === "DONE") row.done += 1;
    else {
      row.open += 1;
      if (issue.status === "IN_REVIEW") row.inReview += 1;
      if (issue.dueDate && isOverdue(new Date(`${issue.dueDate}T00:00:00.000Z`), issue.status, timeZone, at)) row.overdue += 1;
    }
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function priorityRows(issues: IssueFact[], projects: PortfolioProject[]): OverdueRow[] {
  const byId = new Map(projects.map((project) => [project.id, project]));
  return executableFacts(issues)
    .filter((issue) => issue.status !== "DONE" && (issue.priority === "HIGH" || issue.priority === "HIGHEST"))
    .map((issue) => {
      const project = byId.get(issue.projectId);
      return {
        id: issue.id,
        key: `${project?.key ?? ""}-${issue.number}`,
        title: issue.title,
        projectKey: project?.key ?? "",
        projectName: project?.name ?? "",
        assigneeName: issue.assigneeName,
        priority: issue.priority,
        dueDate: issue.dueDate ?? "",
        overdueDays: 0,
        status: issue.status,
      };
    })
    .sort((a, b) => (a.priority === "HIGHEST" ? 0 : 1) - (b.priority === "HIGHEST" ? 0 : 1) || a.key.localeCompare(b.key));
}

export { ISSUE_STATUSES, ISSUE_TYPES };
