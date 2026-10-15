import "dotenv/config";
import { Client } from "pg";
import { databaseName } from "@/lib/test-database";

/**
 * Removes Playwright leftovers from the local development database only.
 * Titles created by e2e are prefixed "E2E ". The old e2e edit of AQUA-1 is restored
 * to the seed status. This script refuses every database except `pms_dev`.
 */
async function main(): Promise<void> {
  const devUrl = process.env.DATABASE_URL;
  if (!devUrl) throw new Error("DATABASE_URL is not set.");
  const name = databaseName(devUrl);
  if (name !== "pms_dev") {
    throw new Error(`Refusing to clean "${name}". This script only runs against pms_dev.`);
  }

  const client = new Client({ connectionString: devUrl });
  await client.connect();
  try {
    const current = await client.query<{ name: string }>("SELECT current_database() AS name");
    if (current.rows[0]?.name !== "pms_dev") {
      throw new Error(`Connected to ${current.rows[0]?.name ?? "unknown"}, expected pms_dev.`);
    }

    await client.query("BEGIN");
    await client.query("ALTER TABLE activity_events DISABLE TRIGGER activity_events_append_only");

    const polluted = await client.query<{ id: string }>(
      `SELECT id FROM issues WHERE title ~ '^E2E '`,
    );
    const ids = polluted.rows.map((row) => row.id);
    if (ids.length > 0) {
      await client.query(
        `DELETE FROM activity_events WHERE issue_id = ANY($1::text[]) OR entity_id = ANY($1::text[])`,
        [ids],
      );
      await client.query(`DELETE FROM issue_labels WHERE issue_id = ANY($1::text[])`, [ids]);
      await client.query(`DELETE FROM acceptance_criteria WHERE issue_id = ANY($1::text[])`, [ids]);
      await client.query(`DELETE FROM user_story_details WHERE issue_id = ANY($1::text[])`, [ids]);
      let remaining = ids.length;
      while (remaining > 0) {
        const deleted = await client.query(
          `DELETE FROM issues i
           WHERE i.id = ANY($1::text[])
             AND NOT EXISTS (SELECT 1 FROM issues child WHERE child.parent_id = i.id)
           RETURNING i.id`,
          [ids],
        );
        const removed = deleted.rowCount ?? 0;
        if (removed === 0) throw new Error("Could not delete E2E issues; a child row remains.");
        remaining -= removed;
      }
    }

    const restored = await client.query(
      `UPDATE issues i
       SET status = 'IN_PROGRESS', updated_at = NOW()
       FROM projects p
       WHERE i.project_id = p.id
         AND p.key = 'AQUA'
         AND i.number = 1
         AND i.title = 'Guest booking experience'
         AND i.status = 'IN_REVIEW'
       RETURNING i.id`,
    );
    const restoredId = restored.rows[0]?.id as string | undefined;
    if (restoredId) {
      await client.query(
        `DELETE FROM activity_events
         WHERE issue_id = $1 AND action = 'issue.updated'`,
        [restoredId],
      );
    }

    await client.query("ALTER TABLE activity_events ENABLE TRIGGER activity_events_append_only");
    await client.query("COMMIT");
    console.log(`Cleaned ${ids.length} E2E issues from pms_dev. Restored seed epic: ${Boolean(restoredId)}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
