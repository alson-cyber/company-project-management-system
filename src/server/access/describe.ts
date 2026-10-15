import type { AuthContext } from "@/server/access/types";

/** Plain-language summary of the caller's access, for display only (never for decisions). */
export function describeAccess(ctx: AuthContext): string[] {
  const labels: string[] = [];
  if (ctx.workspaceRoles.has("EXECUTIVE")) labels.push("Executive");
  if (ctx.workspaceRoles.has("ADMIN")) labels.push("Administrator");
  const leads = [...ctx.projectRoles.values()].filter((role) => role === "LEAD").length;
  if (leads > 0) labels.push(leads === 1 ? "Lead of 1 project" : `Lead of ${leads} projects`);
  labels.push("Member");
  return labels;
}
