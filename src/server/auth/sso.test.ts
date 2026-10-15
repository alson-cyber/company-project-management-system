import { describe, expect, test } from "vitest";
import { getOidcProviderConfig, getSignInMethods } from "@/server/auth/sso";
import type { Env } from "@/server/env";

const env = {
  AUTH_PASSWORD_LOGIN_ENABLED: true,
} as Env;

describe("OIDC configuration", () => {
  test("is disabled when no AUTH_OIDC_* variables are set", () => {
    expect(getOidcProviderConfig(env)).toBeNull();
    expect(getSignInMethods(env).sso).toBeNull();
    expect(getSignInMethods(env).password).toBe(true);
  });

  test("surfaces a configured provider without hard-coding a vendor", () => {
    const configured = {
      ...env,
      AUTH_OIDC_PROVIDER_ID: "company-sso",
      AUTH_OIDC_DISPLAY_NAME: "Company SSO",
      AUTH_OIDC_DISCOVERY_URL: "https://idp.example.com/.well-known/openid-configuration",
      AUTH_OIDC_CLIENT_ID: "client",
      AUTH_OIDC_CLIENT_SECRET: "secret",
    } as Env;
    expect(getOidcProviderConfig(configured)?.providerId).toBe("company-sso");
    expect(getSignInMethods(configured).sso).toEqual({ providerId: "company-sso", displayName: "Company SSO" });
  });
});
