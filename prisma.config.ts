import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Fallback lets `prisma generate` run during install before a local .env exists.
    url: process.env.DATABASE_URL ?? "postgresql://pms:pms_local_dev@localhost:55432/pms_dev",
  },
});
