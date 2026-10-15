import { execSync } from "node:child_process";
import { config } from "dotenv";
import { Client } from "pg";

config();

const adminUrl = process.env.DATABASE_URL;
const testUrl = process.env.TEST_DATABASE_URL;

if (!adminUrl) throw new Error("DATABASE_URL is not set.");
if (!testUrl) throw new Error("TEST_DATABASE_URL is not set.");

const testName = new URL(testUrl).pathname.replace(/^\//, "");
if (!testName || !/^[a-z0-9_]+$/i.test(testName)) {
  throw new Error(`Refusing to create a database named ${JSON.stringify(testName)}`);
}

async function ensureDatabase(): Promise<void> {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [testName]);
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE ${testName}`);
      console.log(`Created database ${testName}`);
    }
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  await ensureDatabase();
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
