"use client";

import { useId, useState, type FormEvent } from "react";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { Button, Spinner } from "@/components/ui/button";
import { Field, FormAlert, TextInput, describedBy } from "@/components/ui/field";

const credentialsSchema = z.object({
  email: z.email("Enter your work email address."),
  password: z.string().min(1, "Enter your password."),
});

type FieldName = keyof z.infer<typeof credentialsSchema>;

export interface DevAccount {
  name: string;
  email: string;
  description: string;
}

export function LoginForm({
  redirectTo,
  passwordEnabled,
  sso,
  devAccounts,
}: {
  redirectTo: string;
  passwordEnabled: boolean;
  sso: { providerId: string; displayName: string } | null;
  devAccounts: DevAccount[];
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string[]>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<"password" | "sso" | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = credentialsSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setFieldErrors({});
    setPending("password");
    const { error } = await authClient.signIn.email({ email: parsed.data.email, password: parsed.data.password });
    if (error) {
      setPending(null);
      setFormError(
        error.status === 429
          ? "Too many sign-in attempts. Wait a minute and try again."
          : "We couldn’t sign you in with that email and password.",
      );
      return;
    }
    window.location.assign(redirectTo);
  }

  async function onSso() {
    if (!sso) return;
    setFormError(null);
    setPending("sso");
    const { error } = await authClient.signIn.social({ provider: sso.providerId, callbackURL: redirectTo });
    if (error) {
      setPending(null);
      setFormError(`Sign-in with ${sso.displayName} is unavailable right now.`);
    }
  }

  const emailId = `${id}-email`;
  const passwordId = `${id}-password`;

  return (
    <div className="grid gap-6">
      {formError ? <FormAlert>{formError}</FormAlert> : null}

      {sso ? (
        <Button variant="secondary" size="lg" className="w-full" onClick={onSso} disabled={pending !== null}>
          {pending === "sso" ? <Spinner /> : null}
          Continue with {sso.displayName}
        </Button>
      ) : null}

      {sso && passwordEnabled ? (
        <div className="flex items-center gap-3 text-xs text-muted" role="separator">
          <span className="h-px flex-1 bg-line" />
          or sign in with email
          <span className="h-px flex-1 bg-line" />
        </div>
      ) : null}

      {passwordEnabled ? (
        <form noValidate onSubmit={onSubmit} className="grid gap-4" aria-busy={pending === "password"}>
          <Field id={emailId} label="Work email" errors={fieldErrors.email}>
            <TextInput
              id={emailId}
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoFocus
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={describedBy(emailId, fieldErrors.email)}
              className="h-11"
            />
          </Field>

          <Field id={passwordId} label="Password" errors={fieldErrors.password}>
            <div className="relative">
              <TextInput
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={fieldErrors.password ? true : undefined}
                aria-describedby={describedBy(passwordId, fieldErrors.password)}
                className="h-11 pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-pressed={showPassword}
                aria-controls={passwordId}
                className="absolute inset-y-1.5 right-1.5 rounded-md px-2.5 text-xs font-semibold text-muted hover:bg-surface-3 hover:text-ink"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending !== null}>
            {pending === "password" ? (
              <>
                <Spinner /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      ) : null}

      {devAccounts.length > 0 && passwordEnabled ? (
        <details className="rounded-lg border border-dashed border-line-strong bg-surface-2 px-4 py-3 text-[13px]">
          <summary className="cursor-pointer font-semibold text-ink">Development accounts</summary>
          <p className="mt-2 text-muted">
            Local development only. The password for every account is the <code>SEED_DEV_PASSWORD</code> value in
            your <code>.env</code>.
          </p>
          <ul className="mt-2 grid gap-1">
            {devAccounts.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-surface-3"
                  onClick={() => {
                    setEmail(account.email);
                    document.getElementById(passwordId)?.focus();
                  }}
                >
                  <span className="font-medium text-ink">{account.name}</span>
                  <span className="text-xs text-muted">{account.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
