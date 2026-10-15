/** Database name from a PostgreSQL URL, without query string. */
export function databaseName(connectionString: string): string {
  const name = new URL(connectionString).pathname.replace(/^\//, "").split("?")[0] ?? "";
  return name;
}

/**
 * Playwright must talk to a dedicated test database. It must never be the
 * development database, so test creates and cleanups cannot change local seed data.
 */
export function assertIsolatedTestDatabase(testUrl: string, devUrl?: string): string {
  const testName = databaseName(testUrl);
  if (!testName.endsWith("_test")) {
    throw new Error(
      `E2E must use a database whose name ends with "_test" (got "${testName || "(empty)"}").`,
    );
  }
  if (devUrl) {
    const devName = databaseName(devUrl);
    if (devName === testName) {
      throw new Error(
        `E2E database "${testName}" is the same as the development database. Refusing to continue.`,
      );
    }
  }
  return testName;
}
