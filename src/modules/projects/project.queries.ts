import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { ProjectHealth, ProjectRole, ProjectStatus, UserStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { assertWorkspacePermission, hasWorkspacePermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";

export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  health: ProjectHealth | null;
  healthNote: string | null;
  healthUpdatedAt: Date | null;
  targetDate: Date | null;
  lead: { id: string; name: string } | null;
  memberCount: number;
  /** The caller's own role in the project, or null (e.g. an Executive viewing as non-member). */
  viewerRole: ProjectRole | null;
}

export interface ProjectMemberView {
  userId: string;
  name: string;
  email: string;
  jobTitle: string | null;
  status: UserStatus;
  role: ProjectRole;
  joinedAt: Date;
}

export interface ProjectDetail extends ProjectSummary {
  healthUpdatedBy: { id: string; name: string } | null;
  createdAt: Date;
  members: ProjectMemberView[];
}

const summarySelect = {
  id: true,
  key: true,
  name: true,
  description: true,
  color: true,
  status: true,
  health: true,
  healthNote: true,
  healthUpdatedAt: true,
  targetDate: true,
  members: {
    where: { role: "LEAD" },
    select: { user: { select: { id: true, name: true } } },
  },
  _count: { select: { members: true } },
} satisfies Prisma.ProjectSelect;

type SummaryRow = Prisma.ProjectGetPayload<{ select: typeof summarySelect }>;

function toSummary(ctx: AuthContext, row: SummaryRow): ProjectSummary {
  const { members, _count, ...rest } = row;
  return {
    ...rest,
    lead: members[0]?.user ?? null,
    memberCount: _count.members,
    viewerRole: ctx.projectRoles.get(row.id) ?? null,
  };
}

/**
 * SQL-level visibility scope for project content. Executives see every project in the
 * workspace; everyone else (including Admins) sees only projects they belong to.
 */
export function visibleProjectsWhere(ctx: AuthContext): Prisma.ProjectWhereInput {
  const base: Prisma.ProjectWhereInput = { workspaceId: ctx.workspace.id, archivedAt: null };
  if (hasWorkspacePermission(ctx, "executive.view")) return base;
  return { ...base, members: { some: { userId: ctx.userId } } };
}

export async function listVisibleProjects(ctx: AuthContext): Promise<ProjectSummary[]> {
  const rows = await prisma.project.findMany({
    where: visibleProjectsWhere(ctx),
    select: summarySelect,
    orderBy: { name: "asc" },
  });
  return rows.map((row) => toSummary(ctx, row));
}

/** Projects the caller is a member of (used for navigation and "my projects"). */
export async function listMyProjects(ctx: AuthContext): Promise<ProjectSummary[]> {
  const rows = await prisma.project.findMany({
    where: { workspaceId: ctx.workspace.id, archivedAt: null, members: { some: { userId: ctx.userId } } },
    select: summarySelect,
    orderBy: { name: "asc" },
  });
  return rows.map((row) => toSummary(ctx, row));
}

/** Returns null when the project does not exist or the caller may not see it. */
export async function getVisibleProjectByKey(ctx: AuthContext, key: string): Promise<ProjectDetail | null> {
  const row = await prisma.project.findFirst({
    where: { ...visibleProjectsWhere(ctx), key: key.toUpperCase() },
    select: {
      ...summarySelect,
      createdAt: true,
      healthUpdatedBy: { select: { id: true, name: true } },
    },
  });
  if (!row) return null;

  const members = await prisma.projectMember.findMany({
    where: { projectId: row.id },
    select: {
      role: true,
      joinedAt: true,
      user: { select: { id: true, name: true, email: true, jobTitle: true, status: true } },
    },
    orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
  });

  const { createdAt, healthUpdatedBy, ...summaryRow } = row;
  return {
    ...toSummary(ctx, summaryRow),
    createdAt,
    healthUpdatedBy,
    members: members.map((member) => ({
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      jobTitle: member.user.jobTitle,
      status: member.user.status,
      role: member.role,
      joinedAt: member.joinedAt,
    })),
  };
}

/** Company-wide portfolio for the Executive view. */
export async function listExecutivePortfolio(ctx: AuthContext): Promise<ProjectSummary[]> {
  assertWorkspacePermission(ctx, "executive.view");
  const rows = await prisma.project.findMany({
    where: { workspaceId: ctx.workspace.id, archivedAt: null },
    select: summarySelect,
    orderBy: { name: "asc" },
  });
  return rows.map((row) => toSummary(ctx, row));
}

export interface AdminProjectRow {
  id: string;
  key: string;
  name: string;
  status: ProjectStatus;
  lead: { id: string; name: string } | null;
  memberCount: number;
  createdAt: Date;
}

/** Project metadata needed for administration. Deliberately excludes project content. */
export async function listProjectsForAdmin(ctx: AuthContext): Promise<AdminProjectRow[]> {
  assertWorkspacePermission(ctx, "admin.access");
  const rows = await prisma.project.findMany({
    where: { workspaceId: ctx.workspace.id, archivedAt: null },
    select: {
      id: true,
      key: true,
      name: true,
      status: true,
      createdAt: true,
      members: { where: { role: "LEAD" }, select: { user: { select: { id: true, name: true } } } },
      _count: { select: { members: true } },
    },
    orderBy: { key: "asc" },
  });
  return rows.map(({ members, _count, ...row }) => ({
    ...row,
    lead: members[0]?.user ?? null,
    memberCount: _count.members,
  }));
}
