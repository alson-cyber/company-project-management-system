-- Prisma Client fills these when omitted; the database default is a backstop so
-- Better Auth session inserts cannot fail for a missing id.
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "sessions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "accounts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
ALTER TABLE "verifications" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text;
