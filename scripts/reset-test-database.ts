import "dotenv/config";
import { Client } from "pg";
import { seedDevelopmentData } from "@/modules/dev/dev-seed";
import { assertIsolatedTestDatabase } from "@/lib/test-database";
import { createPrismaClient } from "@/server/db";

/**
 * Drops application data in the dedicated test database and re-seeds it.
 * Refuses to run unless the database name ends with `_test` and differs from DATABASE_URL.
 */
async function main(): Promise<void> {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is not set.");
  const name = assertIsolatedTestDatabase(testUrl, process.env.DATABASE_URL);
  const password = process.env.SEED_DEV_PASSWORD;
  if (!password) throw new Error("SEED_DEV_PASSWORD is not set.");

  const client = new Client({ connectionString: testUrl });
  await client.connect();
  try {
    const current = await client.query<{ name: string }>("SELECT current_database() AS name");
    if (current.rows[0]?.name !== name) {
      throw new Error(`Connected to ${current.rows[0]?.name ?? "unknown"}, expected ${name}.`);
    }
    await client.query(`
      TRUNCATE TABLE
        activity_events,
        issue_labels,
        acceptance_criteria,
        user_story_details,
        issues,
        labels,
        project_members,
        projects,
        workspace_role_grants,
        workspace_members,
        sessions,
        accounts,
        verifications,
        users,
        workspaces
      RESTART IDENTITY CASCADE
    `);
  } finally {
    await client.end();
  }

  const db = createPrismaClient(testUrl);
  try {
    const summary = await seedDevelopmentData(db, {
      password,
      ...(process.env.WORKSPACE_SLUG ? { workspaceSlug: process.env.WORKSPACE_SLUG } : {}),
    });
    console.log(`Reset test database ${name}: ${summary.issuesCreated} issues seeded.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
