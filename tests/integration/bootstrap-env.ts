import { config } from "dotenv";

config();

if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is required for integration tests. Start Postgres with `pnpm db:up`.");
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.BETTER_AUTH_SECRET ??= "test-secret-which-is-32-chars-min";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.SEED_DEV_PASSWORD ??= "workhub-dev-only-pass";
process.env.WORKSPACE_SLUG ??= "company";
process.env.COMPANY_TIMEZONE ??= "UTC";
process.env.STORAGE_DRIVER ??= "local";
