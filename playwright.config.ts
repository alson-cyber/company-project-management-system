import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config();

const port = 3100;
// localhost, not 127.0.0.1: the browser and Better Auth must share one origin.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? `pnpm exec next start -p ${port}` : `pnpm exec next dev -p ${port}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...process.env,
          DATABASE_URL: testDatabaseUrl ?? "",
          // Better Auth rejects sign-in when the browser origin does not match this URL.
          BETTER_AUTH_URL: baseURL,
        },
      },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
