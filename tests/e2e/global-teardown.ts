import { config } from "dotenv";
import { Client } from "pg";
import { databaseName } from "../../src/lib/test-database";

/**
 * Fails the run if Playwright wrote E2E-titled issues into the development database.
 */
export default async function globalTeardown(): Promise<void> {
  config();
  const devUrl = process.env.DATABASE_URL;
  if (!devUrl) return;
  const name = databaseName(devUrl);
  if (name.endsWith("_test")) return;

  const client = new Client({ connectionString: devUrl });
  await client.connect();
  try {
    const current = await client.query<{ name: string }>("SELECT current_database() AS name");
    if (current.rows[0]?.name?.endsWith("_test")) return;
    const polluted = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM issues WHERE title ~ '^E2E '`,
    );
    const count = Number(polluted.rows[0]?.count ?? "0");
    if (count > 0) {
      throw new Error(
        `Development database ${current.rows[0]?.name} contains ${count} E2E issue(s). Playwright must use TEST_DATABASE_URL.`,
      );
    }
  } finally {
    await client.end();
  }
}
