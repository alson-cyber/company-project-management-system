import { ForbiddenError, NotFoundError } from "@/server/errors";
import type { AuthContext } from "@/server/access/types";

/** Workspace-level capabilities. */
export type WorkspacePermission =
  /** Company-wide portfolio, health, activity and contribution visibility. */
  | "executive.view"
  /** Administration area: users, roles, configuration. */
  | "admin.access"
  | "project.create";

/** Capabilities evaluated against one project. */
export type ProjectPermission =
  /** Read project content. */
  | "project.view"
  /** Operational participation: comments, notes, issues (next stage). */
  | "project.participate"
  /** Project structure, membership and settings. */
  | "project.manage"
  | "project.health.set";

export function hasWorkspacePermission(ctx: AuthContext, permission: WorkspacePermission): boolean {
  switch (permission) {
    case "executive.view":
      return ctx.workspaceRoles.has("EXECUTIVE");
    case "admin.access":
    case "project.create":
      return ctx.workspaceRoles.has("ADMIN");
  }
}

export function hasProjectPermission(ctx: AuthContext, permission: ProjectPermission, projectId: string): boolean {
  const role = ctx.projectRoles.get(projectId);
  switch (permission) {
    case "project.view":
      // Executive visibility is company-wide; Admin is deliberately not included.
      return role !== undefined || ctx.workspaceRoles.has("EXECUTIVE");
    case "project.participate":
      // Participation always requires membership, including for Executives and Admins.
      return role !== undefined;
    case "project.manage":
    case "project.health.set":
      return role === "LEAD";
  }
}

export function assertWorkspacePermission(ctx: AuthContext, permission: WorkspacePermission): void {
  if (!hasWorkspacePermission(ctx, permission)) throw new ForbiddenError();
}

/**
 * Throws NotFoundError when the caller cannot even see the project (so its existence is not
 * revealed) and ForbiddenError when they can see it but lack the specific capability.
 */
export function assertProjectPermission(ctx: AuthContext, permission: ProjectPermission, projectId: string): void {
  if (!hasProjectPermission(ctx, "project.view", projectId)) throw new NotFoundError("Project not found.");
  if (!hasProjectPermission(ctx, permission, projectId)) throw new ForbiddenError();
}
