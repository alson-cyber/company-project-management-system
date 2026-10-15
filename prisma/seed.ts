import "dotenv/config";
import { createPrismaClient } from "@/server/db";
import { seedDevelopmentData } from "@/modules/dev/dev-seed";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the development seed with NODE_ENV=production.");
  }
  const databaseUrl = process.env.DATABASE_URL;
  const password = process.env.SEED_DEV_PASSWORD;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  if (!password) throw new Error("SEED_DEV_PASSWORD is not set (see .env.example).");

  const db = createPrismaClient(databaseUrl);
  try {
    const summary = await seedDevelopmentData(db, {
      password,
      ...(process.env.WORKSPACE_SLUG ? { workspaceSlug: process.env.WORKSPACE_SLUG } : {}),
    });
    console.log(
      `Seeded workspace ${summary.workspaceId}: ${summary.users} users, ${summary.projects} projects ` +
        `(${summary.projectsCreated} new), ${summary.memberships} memberships.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
