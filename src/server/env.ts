import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const MEGABYTE = 1024 * 1024;

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    DATABASE_URL: z.url(),

    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z.url(),
    AUTH_PASSWORD_LOGIN_ENABLED: z.stringbool().default(true),

    AUTH_OIDC_PROVIDER_ID: optionalString,
    AUTH_OIDC_DISPLAY_NAME: optionalString,
    AUTH_OIDC_DISCOVERY_URL: optionalString.pipe(z.url().optional()),
    AUTH_OIDC_CLIENT_ID: optionalString,
    AUTH_OIDC_CLIENT_SECRET: optionalString,

    WORKSPACE_SLUG: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .default("company"),

    /** IANA time zone used for "today" when computing overdue. Dates themselves are stored as calendar dates (no zone). */
    COMPANY_TIMEZONE: z
      .string()
      .trim()
      .min(1)
      .default("UTC")
      .superRefine((value, ctx) => {
        try {
          Intl.DateTimeFormat("en-US", { timeZone: value });
        } catch {
          ctx.addIssue({ code: "custom", message: "Must be a valid IANA time zone (for example UTC or Asia/Dubai)." });
        }
      }),

    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default(".data/storage"),
    S3_BUCKET: optionalString,
    S3_REGION: optionalString,
    S3_ENDPOINT: optionalString.pipe(z.url().optional()),
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_FORCE_PATH_STYLE: z.stringbool().default(false),

    ATTACHMENT_MAX_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .max(1024 * MEGABYTE)
      .default(25 * MEGABYTE),
  })
  .superRefine((env, ctx) => {
    const oidc = [
      "AUTH_OIDC_PROVIDER_ID",
      "AUTH_OIDC_DISPLAY_NAME",
      "AUTH_OIDC_DISCOVERY_URL",
      "AUTH_OIDC_CLIENT_ID",
      "AUTH_OIDC_CLIENT_SECRET",
    ] as const;
    const configured = oidc.filter((key) => env[key] !== undefined);
    if (configured.length > 0 && configured.length < oidc.length) {
      for (const key of oidc.filter((k) => env[k] === undefined)) {
        ctx.addIssue({ code: "custom", path: [key], message: "Required when any AUTH_OIDC_* variable is set" });
      }
    }

    if (env.STORAGE_DRIVER === "s3") {
      for (const key of ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const) {
        if (!env[key]) {
          ctx.addIssue({ code: "custom", path: [key], message: "Required when STORAGE_DRIVER is s3" });
        }
      }
    }

    if (!env.AUTH_PASSWORD_LOGIN_ENABLED && configured.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_PASSWORD_LOGIN_ENABLED"],
        message: "At least one sign-in method must be enabled (password or OIDC)",
      });
    }

    const localPreview =
      env.BETTER_AUTH_URL.startsWith("http://localhost") || env.BETTER_AUTH_URL.startsWith("http://127.0.0.1");
    if (env.NODE_ENV === "production" && !localPreview) {
      const secret = env.BETTER_AUTH_SECRET.toLowerCase();
      if (secret.includes("replace-with") || secret.includes("dev-only") || secret.includes("changeme")) {
        ctx.addIssue({
          code: "custom",
          path: ["BETTER_AUTH_SECRET"],
          message: "Production refuses a placeholder or development secret",
        });
      }
      if (env.DATABASE_URL.includes("pms_local_dev")) {
        ctx.addIssue({
          code: "custom",
          path: ["DATABASE_URL"],
          message: "Production refuses the local development database credential",
        });
      }
    }
  });

export type Env = z.output<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}

let cached: Env | undefined;

/** Validated environment. Parsed on first use so tooling can import modules without a full env. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
