import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";
import { prisma } from "@/server/db";
import { getEnv } from "@/server/env";
import { getOidcProviderConfig } from "@/server/auth/sso";

const env = getEnv();
const oidc = getOidcProviderConfig(env);

const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7;
const SESSION_REFRESH_SECONDS = 60 * 60 * 24;

export const auth = betterAuth({
  appName: "Workhub",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  telemetry: { enabled: false },
  // Sign-in rate limiting is for production. Local tests log in many times in one run.
  rateLimit: { enabled: env.NODE_ENV === "production" },
  advanced: {
    // Secure cookies when the public origin is HTTPS. Local HTTP development stays usable.
    useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
    database: {
      // Prisma requires `id` on create; generate it before the adapter writes.
      generateId: () => crypto.randomUUID(),
    },
  },

  emailAndPassword: {
    enabled: env.AUTH_PASSWORD_LOGIN_ENABLED,
    // Accounts are provisioned by administrators (or the development seed), never self-registered.
    disableSignUp: true,
    minPasswordLength: 12,
  },

  session: {
    expiresIn: SESSION_LIFETIME_SECONDS,
    updateAge: SESSION_REFRESH_SECONDS,
    // Every request validates the session row so revocation and deactivation apply immediately.
    cookieCache: { enabled: false },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: oidc ? [oidc.providerId] : [],
    },
  },

  databaseHooks: {
    session: {
      create: {
        // Applies to every sign-in method: deactivated users cannot obtain a session.
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { status: true },
          });
          if (!user || user.status !== "ACTIVE") return false;
          return { data: session };
        },
      },
    },
  },

  plugins: [
    ...(oidc
      ? [
          genericOAuth({
            config: [
              {
                providerId: oidc.providerId,
                discoveryUrl: oidc.discoveryUrl,
                clientId: oidc.clientId,
                clientSecret: oidc.clientSecret,
                scopes: ["openid", "email", "profile"],
                pkce: true,
                requireIdTokenVerification: true,
                // Only users already provisioned in the workspace may sign in through SSO.
                disableImplicitSignUp: true,
              },
            ],
          }),
        ]
      : []),
    // Must be last: lets Server Actions set auth cookies.
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
