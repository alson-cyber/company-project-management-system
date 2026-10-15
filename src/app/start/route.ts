import { NextResponse, type NextRequest } from "next/server";
import { getSessionState } from "@/server/access/session";
import { hasWorkspacePermission } from "@/server/access/policy";

/** Post-sign-in landing: sends each user to the right starting point for their role. */
export async function GET(request: NextRequest) {
  const state = await getSessionState();
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (state.status === "signed-out") return to("/login");
  if (state.status === "no-access") return to("/login?error=no-access");

  const { ctx } = state;
  if (hasWorkspacePermission(ctx, "executive.view")) return to("/executive");
  if (hasWorkspacePermission(ctx, "admin.access") && ctx.projectRoles.size === 0) return to("/admin");
  return to("/my-work");
}
