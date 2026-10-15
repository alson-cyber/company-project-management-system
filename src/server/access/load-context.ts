import type { Database } from "@/server/db";
import type { AuthContext } from "@/server/access/types";

/**
 * Builds the AuthContext for an authenticated user id. Returns null when the user is
 * deactivated or is not a member of the workspace, which callers treat as "no access".
 */
export async function loadAuthContext(db: Database, userId: string, workspaceSlug: string): Promise<AuthContext | null> {
  const membership = await db.workspaceMember.findFirst({
    where: { userId, workspace: { slug: workspaceSlug }, user: { status: "ACTIVE" } },
    select: {
      workspace: { select: { id: true, slug: true, name: true } },
      user: { select: { id: true, name: true, email: true, jobTitle: true, image: true } },
    },
  });
  if (!membership) return null;

  const workspaceId = membership.workspace.id;
  const [grants, projectMemberships] = await Promise.all([
    db.workspaceRoleGrant.findMany({ where: { workspaceId, userId }, select: { role: true } }),
    db.projectMember.findMany({
      where: { userId, project: { workspaceId, archivedAt: null } },
      select: { projectId: true, role: true },
    }),
  ]);

  return {
    userId,
    user: membership.user,
    workspace: membership.workspace,
    workspaceRoles: new Set(grants.map((grant) => grant.role)),
    projectRoles: new Map(projectMemberships.map((member) => [member.projectId, member.role])),
  };
}
