import "server-only";
import { calendarDayUtc, todayInTimeZone } from "@/lib/calendar";
import { visibleProjectsWhere } from "@/modules/projects/project.queries";
import { derivePortfolio, type IssueFact, type PortfolioProject, type PortfolioProjectInput } from "@/modules/reporting/portfolio.derive";
import { prisma } from "@/server/db";
import { assertWorkspacePermission } from "@/server/access/policy";
import { getEnv } from "@/server/env";
import type { AuthContext } from "@/server/access/types";

const issueSelect = {
  id: true,
  projectId: true,
  number: true,
  title: true,
  type: true,
  parentId: true,
  status: true,
  priority: true,
  dueDate: true,
  updatedAt: true,
  completedAt: true,
  completedById: true,
  assignee: { select: { id: true, name: true } },
} as const;

/** One read of the issues the viewer may see. Reports and the portfolio share this. */
export async function loadVisibleIssueFacts(ctx: AuthContext): Promise<IssueFact[]> {
  const issues = await prisma.issue.findMany({
    where: { project: visibleProjectsWhere(ctx), archivedAt: null },
    select: issueSelect,
  });
  return issues.map((issue) => ({
    id: issue.id,
    projectId: issue.projectId,
    number: issue.number,
    title: issue.title,
    type: issue.type,
    parentId: issue.parentId,
    status: issue.status,
    priority: issue.priority,
    dueDate: issue.dueDate ? calendarDayUtc(issue.dueDate) : null,
    updatedDay: todayInTimeZone(getEnv().COMPANY_TIMEZONE, issue.updatedAt),
    assigneeId: issue.assignee?.id ?? null,
    assigneeName: issue.assignee?.name ?? null,
    completedAt: issue.completedAt,
    completedById: issue.completedById,
  }));
}

export async function loadVisibleProjects(ctx: AuthContext): Promise<PortfolioProjectInput[]> {
  const projects = await prisma.project.findMany({
    where: visibleProjectsWhere(ctx),
    select: {
      id: true,
      key: true,
      name: true,
      color: true,
      status: true,
      health: true,
      healthNote: true,
      targetDate: true,
      members: { where: { role: "LEAD" }, select: { user: { select: { id: true, name: true } } }, take: 1 },
    },
    orderBy: { name: "asc" },
  });
  return projects.map((project) => ({
    id: project.id,
    key: project.key,
    name: project.name,
    color: project.color,
    status: project.status,
    health: project.health,
    healthNote: project.healthNote,
    targetDate: project.targetDate,
    lead: project.members[0]?.user ?? null,
  }));
}

/** Company portfolio. Executive only. Health is the stored lead label, never derived. */
export async function loadExecutivePortfolio(ctx: AuthContext, at: Date = new Date()): Promise<PortfolioProject[]> {
  assertWorkspacePermission(ctx, "executive.view");
  const [projects, issues] = await Promise.all([loadVisibleProjects(ctx), loadVisibleIssueFacts(ctx)]);
  return derivePortfolio(projects, issues, getEnv().COMPANY_TIMEZONE, at);
}

/** Same derivation, limited to projects the viewer can actually see. */
export async function loadVisiblePortfolio(ctx: AuthContext, at: Date = new Date()): Promise<PortfolioProject[]> {
  const [projects, issues] = await Promise.all([loadVisibleProjects(ctx), loadVisibleIssueFacts(ctx)]);
  return derivePortfolio(projects, issues, getEnv().COMPANY_TIMEZONE, at);
}
