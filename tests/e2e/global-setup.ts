import { execSync } from "node:child_process";
import { config } from "dotenv";
import { assertIsolatedTestDatabase } from "../../src/lib/test-database";

export default function globalSetup(): void {
  config();
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is required for Playwright.");
  assertIsolatedTestDatabase(testUrl, process.env.DATABASE_URL);

  execSync("pnpm exec tsx scripts/prepare-test-db.ts", { stdio: "inherit", env: process.env });
  execSync("pnpm exec tsx scripts/reset-test-database.ts", { stdio: "inherit", env: process.env });
}
