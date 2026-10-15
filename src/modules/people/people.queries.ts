import "server-only";
import type { ProjectRole, UserStatus, WorkspaceRole } from "@/generated/prisma/enums";
import { visibleProjectsWhere } from "@/modules/projects/project.queries";
import { prisma } from "@/server/db";
import { assertWorkspacePermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";

export interface PersonView {
  id: string;
  name: string;
  jobTitle: string | null;
  /** Only projects the viewer can see. */
  projects: { key: string; name: string; color: string; role: ProjectRole }[];
}

/** Workspace directory. Project memberships are filtered to what the viewer may see. */
export async function listWorkspacePeople(ctx: AuthContext): Promise<PersonView[]> {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: ctx.workspace.id, user: { status: "ACTIVE" } },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          jobTitle: true,
          projectMemberships: {
            where: { project: visibleProjectsWhere(ctx) },
            select: { role: true, project: { select: { key: true, name: true, color: true } } },
            orderBy: { project: { name: "asc" } },
          },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return members.map(({ user }) => ({
    id: user.id,
    name: user.name,
    jobTitle: user.jobTitle,
    projects: user.projectMemberships.map((membership) => ({ ...membership.project, role: membership.role })),
  }));
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  status: UserStatus;
  workspaceRoles: WorkspaceRole[];
  projectCount: number;
}

export async function listUsersForAdmin(ctx: AuthContext): Promise<AdminUserRow[]> {
  assertWorkspacePermission(ctx, "admin.access");
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: ctx.workspace.id },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
          status: true,
          roleGrants: { where: { workspaceId: ctx.workspace.id }, select: { role: true } },
          _count: { select: { projectMemberships: true } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return members.map(({ user }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    jobTitle: user.jobTitle,
    status: user.status,
    workspaceRoles: user.roleGrants.map((grant) => grant.role).sort(),
    projectCount: user._count.projectMemberships,
  }));
}

/** Active workspace members who can be chosen as a project lead. */
export async function listLeadCandidates(ctx: AuthContext): Promise<{ id: string; name: string; jobTitle: string | null }[]> {
  assertWorkspacePermission(ctx, "project.create");
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: ctx.workspace.id, user: { status: "ACTIVE" } },
    select: { user: { select: { id: true, name: true, jobTitle: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return members.map(({ user }) => user);
}
