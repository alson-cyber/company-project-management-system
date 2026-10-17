import "dotenv/config";
import { Client } from "pg";
import { databaseName } from "@/lib/test-database";

/**
 * Deletes the stray QA project (name Aquadesk, key EXAMPLE) from pms_dev.
 * Refuses every other database and every other project, including AQUA, SV, AIB and PMS.
 */
async function main(): Promise<void> {
  const devUrl = process.env.DATABASE_URL;
  if (!devUrl) throw new Error("DATABASE_URL is not set.");
  if (databaseName(devUrl) !== "pms_dev") {
    throw new Error(`Refusing to clean "${databaseName(devUrl)}". This script only runs against pms_dev.`);
  }

  const client = new Client({ connectionString: devUrl });
  await client.connect();
  let started = false;
  try {
    const current = await client.query<{ name: string }>("SELECT current_database() AS name");
    if (current.rows[0]?.name !== "pms_dev") {
      throw new Error(`Connected to ${current.rows[0]?.name ?? "unknown"}, expected pms_dev.`);
    }

    const project = await client.query<{ id: string; name: string; key: string }>(
      `SELECT id, name, key FROM projects WHERE key = 'EXAMPLE'`,
    );
    const row = project.rows[0];
    if (!row) {
      console.log("No EXAMPLE project is present.");
      return;
    }
    if (row.name !== "Aquadesk" || project.rows.length !== 1) {
      throw new Error(`Refusing to delete key EXAMPLE (name "${row.name}", rows ${project.rows.length}).`);
    }

    await client.query("BEGIN");
    started = true;
    await client.query("ALTER TABLE activity_events DISABLE TRIGGER activity_events_append_only");
    const id = row.id;
    const issueIds = `SELECT id FROM issues WHERE project_id = $1`;
    await client.query(`DELETE FROM notifications WHERE project_id = $1 OR issue_id IN (${issueIds})`, [id]);
    await client.query(`DELETE FROM activity_events WHERE project_id = $1 OR issue_id IN (${issueIds})`, [id]);
    await client.query(`DELETE FROM issue_notes WHERE issue_id IN (${issueIds})`, [id]);
    await client.query(`DELETE FROM issue_comments WHERE issue_id IN (${issueIds})`, [id]);
    await client.query(`DELETE FROM issue_attachments WHERE issue_id IN (${issueIds})`, [id]);
    await client.query(`DELETE FROM issue_labels WHERE issue_id IN (${issueIds})`, [id]);
    await client.query(`DELETE FROM acceptance_criteria WHERE issue_id IN (${issueIds})`, [id]);
    await client.query(`DELETE FROM user_story_details WHERE issue_id IN (${issueIds})`, [id]);
    for (;;) {
      const deleted = await client.query(
        `DELETE FROM issues i
         WHERE i.project_id = $1
           AND NOT EXISTS (SELECT 1 FROM issues child WHERE child.parent_id = i.id)
         RETURNING i.id`,
        [id],
      );
      if ((deleted.rowCount ?? 0) === 0) break;
    }
    const leftover = await client.query(`SELECT id FROM issues WHERE project_id = $1`, [id]);
    if (leftover.rows.length > 0) throw new Error("EXAMPLE still has issues; nothing was committed.");
    await client.query(`DELETE FROM labels WHERE project_id = $1`, [id]);
    await client.query(`DELETE FROM project_members WHERE project_id = $1`, [id]);
    await client.query(`DELETE FROM projects WHERE id = $1 AND key = 'EXAMPLE' AND name = 'Aquadesk'`, [id]);
    await client.query("ALTER TABLE activity_events ENABLE TRIGGER activity_events_append_only");
    await client.query("COMMIT");
    console.log("Removed stray project Aquadesk (EXAMPLE) from pms_dev.");
  } catch (error) {
    if (started) await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
