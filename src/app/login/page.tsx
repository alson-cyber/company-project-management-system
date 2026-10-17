import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/session";
import { LoginForm } from "@/app/login/login-form";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { getSessionState } from "@/server/access/session";
import { getSignInMethods } from "@/server/auth/sso";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "Sign in" };

const HIERARCHY = ["Project", "Epic", "User Story", "Task", "Sub-task"] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const state = await getSessionState();
  if (state.status === "active") redirect(safeRedirectPath(next));

  const env = getEnv();
  const methods = getSignInMethods(env);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <main className="flex flex-col bg-surface px-6 py-8 sm:px-12">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[15px] font-bold tracking-[-0.02em]">Workhub</span>
        </div>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em]">Sign in to Workhub</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The company workspace for projects, delivery and decisions.
          </p>

          <div className="mt-8">
            {state.status === "no-access" ? (
              <div className="grid gap-4">
                <FormAlert>
                  {state.email} is signed in but does not have access to this workspace. Ask an administrator to add
                  you, or sign out and use a different account.
                </FormAlert>
                <form action={signOutAction}>
                  <Button type="submit" variant="secondary" size="lg" className="w-full">
                    Sign out
                  </Button>
                </form>
              </div>
            ) : (
              <LoginForm
                redirectTo={safeRedirectPath(next)}
                passwordEnabled={methods.password}
                sso={methods.sso}
              />
            )}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted">
            Accounts are created by your workspace administrator. If you can’t sign in, contact IT support.
          </p>
        </div>
      </main>

      <aside className="hidden flex-col justify-between bg-nav px-12 py-10 text-nav-text lg:flex" aria-hidden="true">
        <p className="text-[13px] font-medium text-nav-muted">Internal project management</p>
        <div className="max-w-md">
          <p className="text-[26px] font-semibold leading-snug tracking-[-0.03em] text-white">
            Clarity from the company portfolio down to the smallest task.
          </p>
          <ol className="mt-10 grid gap-2.5">
            {HIERARCHY.map((level, index) => (
              <li
                key={level}
                className="flex items-center gap-3 text-sm"
                style={{ paddingLeft: `${index * 18}px` }}
              >
                <span className="h-px w-3 bg-nav-muted/60" />
                <span className={index === 0 ? "font-semibold text-white" : "text-nav-text"}>{level}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-nav-muted">Access is limited to authorised company staff.</p>
      </aside>
    </div>
  );
}
