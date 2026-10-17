import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic gate only: sends visitors without a session cookie to /login. It does not
 * validate the session — every page, Server Action and Route Handler re-checks the session
 * and permissions against the database (src/server/access/session.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login" || getSessionCookie(request)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!api/auth|api/reports|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
