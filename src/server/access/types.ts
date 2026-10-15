import type { ProjectRole, WorkspaceRole } from "@/generated/prisma/enums";

/**
 * Everything authorization needs about the current caller, loaded server-side from the
 * session. Never constructed from client-supplied data.
 *
 * Role model (docs/PRODUCT-RULES.md §7):
 * - MEMBER        — an active member of the workspace (the baseline; no grant needed)
 * - PROJECT_LEAD  — ProjectRole.LEAD on a specific project
 * - ADMIN         — WorkspaceRole.ADMIN: system/user/configuration administration
 * - EXECUTIVE     — WorkspaceRole.EXECUTIVE: company-wide read visibility
 */
export interface AuthContext {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    jobTitle: string | null;
    image: string | null;
  };
  workspace: {
    id: string;
    slug: string;
    name: string;
  };
  workspaceRoles: ReadonlySet<WorkspaceRole>;
  /** projectId → role, for non-archived projects in this workspace. */
  projectRoles: ReadonlyMap<string, ProjectRole>;
}
