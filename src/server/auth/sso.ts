import type { Env } from "@/server/env";

export interface OidcProviderConfig {
  providerId: string;
  displayName: string;
  discoveryUrl: string;
  clientId: string;
  clientSecret: string;
}

/** Company SSO is any OpenID Connect provider configured through AUTH_OIDC_* variables. */
export function getOidcProviderConfig(env: Env): OidcProviderConfig | null {
  if (
    !env.AUTH_OIDC_PROVIDER_ID ||
    !env.AUTH_OIDC_DISPLAY_NAME ||
    !env.AUTH_OIDC_DISCOVERY_URL ||
    !env.AUTH_OIDC_CLIENT_ID ||
    !env.AUTH_OIDC_CLIENT_SECRET
  ) {
    return null;
  }
  return {
    providerId: env.AUTH_OIDC_PROVIDER_ID,
    displayName: env.AUTH_OIDC_DISPLAY_NAME,
    discoveryUrl: env.AUTH_OIDC_DISCOVERY_URL,
    clientId: env.AUTH_OIDC_CLIENT_ID,
    clientSecret: env.AUTH_OIDC_CLIENT_SECRET,
  };
}

/** What the login screen is allowed to know about available sign-in methods. */
export interface SignInMethods {
  password: boolean;
  sso: { providerId: string; displayName: string } | null;
}

export function getSignInMethods(env: Env): SignInMethods {
  const oidc = getOidcProviderConfig(env);
  return {
    password: env.AUTH_PASSWORD_LOGIN_ENABLED,
    sso: oidc ? { providerId: oidc.providerId, displayName: oidc.displayName } : null,
  };
}
