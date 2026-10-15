import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/db";
import { getEnv } from "@/server/env";
import { UnauthenticatedError } from "@/server/errors";
import { loadAuthContext } from "@/server/access/load-context";
import { hasWorkspacePermission, type WorkspacePermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";

export type SessionState =
  | { status: "signed-out" }
  | { status: "no-access"; email: string }
  | { status: "active"; ctx: AuthContext };

/** Resolves the current request's session against the database once per request. */
export const getSessionState = cache(async (): Promise<SessionState> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { status: "signed-out" };
  const ctx = await loadAuthContext(prisma, session.user.id, getEnv().WORKSPACE_SLUG);
  if (!ctx) return { status: "no-access", email: session.user.email };
  return { status: "active", ctx };
});

/** For pages and layouts: redirects to /login when there is no usable session. */
export async function requireAuthContext(): Promise<AuthContext> {
  const state = await getSessionState();
  if (state.status === "signed-out") redirect("/login");
  if (state.status === "no-access") redirect("/login?error=no-access");
  return state.ctx;
}

/** For pages: unauthorized callers get a 404 so protected areas are not revealed. */
export async function requireWorkspacePermission(permission: WorkspacePermission): Promise<AuthContext> {
  const ctx = await requireAuthContext();
  if (!hasWorkspacePermission(ctx, permission)) notFound();
  return ctx;
}

/** For Server Actions and Route Handlers: throws instead of redirecting. */
export async function getActionAuthContext(): Promise<AuthContext> {
  const state = await getSessionState();
  if (state.status !== "active") throw new UnauthenticatedError();
  return state.ctx;
}
