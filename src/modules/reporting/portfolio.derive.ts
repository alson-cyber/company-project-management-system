import type { IssuePriority, IssueStatus, IssueType, ProjectHealth, ProjectStatus } from "@/generated/prisma/enums";
import { calendarDayUtc, isOverdue, recentWindowStart, todayInTimeZone } from "@/lib/calendar";
import { isExecutable, progressOfProject, type Progress, type ProgressIssue } from "@/modules/issues/issue.progress";
import { managementSignals, stalledCutoff, type AttentionSignal } from "@/modules/reporting/attention.rules";

export const COMPLETED_RECENT_DAYS = 14;

export interface IssueFact {
  id: string;
  projectId: string;
  number: number;
  title: string;
  type: IssueType;
  parentId: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  dueDate: string | null;
  updatedDay: string;
  assigneeId: string | null;
  assigneeName: string | null;
  completedAt: Date | null;
  completedById: string | null;
}

export interface PortfolioProjectInput {
  id: string;
  key: string;
  name: string;
  color: string;
  status: ProjectStatus;
  health: ProjectHealth | null;
  healthNote: string | null;
  targetDate: Date | null;
  lead: { id: string; name: string } | null;
}

export interface PortfolioProject extends PortfolioProjectInput {
  targetDay: string | null;
  progress: Progress;
  openExecutable: number;
  doneExecutable: number;
  overdue: number;
  highestOpen: number;
  highOpen: number;
  inReview: number;
  signals: AttentionSignal[];
}

function asNode(issue: IssueFact): ProgressIssue {
  return {
    id: issue.id,
    parentId: issue.parentId,
    type: issue.type,
    status: issue.status,
    archivedAt: null,
  };
}

export function derivePortfolio(
  projects: PortfolioProjectInput[],
  issues: IssueFact[],
  timeZone: string,
  at: Date = new Date(),
): PortfolioProject[] {
  const today = todayInTimeZone(timeZone, at);
  const cutoff = stalledCutoff(today);
  const byProject = new Map<string, IssueFact[]>();
  for (const issue of issues) {
    const list = byProject.get(issue.projectId) ?? [];
    list.push(issue);
    byProject.set(issue.projectId, list);
  }

  return projects.map((project) => {
    const rows = byProject.get(project.id) ?? [];
    const nodes = rows.map(asNode);
    const executable = rows.filter((issue) => isExecutable(asNode(issue), nodes));
    const open = executable.filter((issue) => issue.status !== "DONE");
    const overdue = open.filter((issue) => isOverdue(issue.dueDate ? new Date(`${issue.dueDate}T00:00:00.000Z`) : null, issue.status, timeZone, at));
    const progress = progressOfProject(nodes);
    const targetDay = project.targetDate ? calendarDayUtc(project.targetDate) : null;
    return {
      ...project,
      targetDay,
      progress,
      openExecutable: open.length,
      doneExecutable: executable.filter((issue) => issue.status === "DONE").length,
      overdue: overdue.length,
      highestOpen: open.filter((issue) => issue.priority === "HIGHEST").length,
      highOpen: open.filter((issue) => issue.priority === "HIGH").length,
      inReview: open.filter((issue) => issue.status === "IN_REVIEW").length,
      signals: managementSignals({
        health: project.health,
        status: project.status,
        targetDate: targetDay,
        today,
        overdueExecutable: overdue.length,
        highestOverdue: overdue.filter((issue) => issue.priority === "HIGHEST").length,
        openExecutable: open.length,
        inReviewExecutable: open.filter((issue) => issue.status === "IN_REVIEW").length,
        stalledExecutable: open.filter((issue) => issue.updatedDay <= cutoff).length,
      }),
    };
  });
}

export interface CompanyMetrics {
  activeProjects: number;
  openExecutable: number;
  overdueExecutable: number;
  highestOpen: number;
  inReview: number;
  completedRecently: number;
  projectsRequiringAttention: number;
}

/** Company totals. Completed recently uses the current completion timestamp, last 14 calendar days. */
export function companyMetrics(projects: PortfolioProject[], issues: IssueFact[], timeZone: string, at: Date = new Date()): CompanyMetrics {
  const nodes = issues.map(asNode);
  const start = recentWindowStart(timeZone, COMPLETED_RECENT_DAYS, at);
  const executable = issues.filter((issue) => isExecutable(asNode(issue), nodes));
  return {
    activeProjects: projects.filter((project) => project.status === "ACTIVE").length,
    openExecutable: projects.reduce((sum, project) => sum + project.openExecutable, 0),
    overdueExecutable: projects.reduce((sum, project) => sum + project.overdue, 0),
    highestOpen: projects.reduce((sum, project) => sum + project.highestOpen, 0),
    inReview: projects.reduce((sum, project) => sum + project.inReview, 0),
    completedRecently: executable.filter((issue) => issue.status === "DONE" && issue.completedAt && issue.completedAt >= start).length,
    projectsRequiringAttention: projects.filter((project) => project.signals.length > 0).length,
  };
}
