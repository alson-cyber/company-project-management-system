import "./bootstrap-env";
import { loadAuthContext } from "@/server/access/load-context";
import type { AuthContext } from "@/server/access/types";
import { seedDevelopmentData } from "@/modules/dev/dev-seed";
import { createPrismaClient, type Database } from "@/server/db";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("TEST_DATABASE_URL is not set.");

export const testDb: Database = createPrismaClient(databaseUrl);

const workspaceSlug = process.env.WORKSPACE_SLUG ?? "company";
const password = process.env.SEED_DEV_PASSWORD ?? "workhub-dev-only-pass";

let seeded = false;

export async function resetDevelopmentSeed() {
  if (!seeded) {
    await seedDevelopmentData(testDb, { password, workspaceSlug });
    seeded = true;
  }
  return { workspaceSlug, password };
}

export async function authContextFor(email: string): Promise<AuthContext> {
  await resetDevelopmentSeed();
  const user = await testDb.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error(`Seed user ${email} is missing.`);
  const ctx = await loadAuthContext(testDb, user.id, workspaceSlug);
  if (!ctx) throw new Error(`No auth context for ${email}.`);
  return ctx;
}

export const emails = {
  executive: "alson.chen@workhub.test",
  lead: "sarah.kim@workhub.test",
  member: "alex.noor@workhub.test",
  designer: "mika.ross@workhub.test",
  admin: "omar.haleem@workhub.test",
  qa: "emma.davis@workhub.test",
  deactivated: "lina.farah@workhub.test",
} as const;
