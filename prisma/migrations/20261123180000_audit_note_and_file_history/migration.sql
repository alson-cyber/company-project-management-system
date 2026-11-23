-- Note titles, categories and immutable revisions. Attachment checksums and an audited purge marker.
-- Existing notes keep their body. The title is the first line, and the category is Product until someone edits it.

DO $$ BEGIN
  CREATE TYPE "NoteCategory" AS ENUM ('PRODUCT', 'DESIGN', 'TECHNICAL', 'DECISION', 'REQUIREMENT', 'MEETING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "issue_notes" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "issue_notes" ADD COLUMN IF NOT EXISTS "category" "NoteCategory";

UPDATE "issue_notes"
SET
  "title" = LEFT(BTRIM(regexp_replace("content", E'[\\n\\r\\t]+', ' ', 'g')), 80),
  "category" = 'PRODUCT'
WHERE "title" IS NULL;

UPDATE "issue_notes" SET "title" = 'Untitled note' WHERE "title" IS NULL OR BTRIM("title") = '';

ALTER TABLE "issue_notes" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "issue_notes" ALTER COLUMN "category" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "issue_notes" ADD CONSTRAINT "issue_notes_title_nonblank" CHECK (btrim("title") <> '');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issue_note_revisions' AND column_name = 'note_id' AND udt_name = 'uuid'
  ) THEN
    DROP TABLE "issue_note_revisions";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "issue_note_revisions" (
    "id" TEXT NOT NULL,
    "note_id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" "NoteCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "edited_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_note_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "issue_note_revisions_note_id_revision_key" ON "issue_note_revisions"("note_id", "revision");
CREATE INDEX IF NOT EXISTS "issue_note_revisions_note_id_revision_idx" ON "issue_note_revisions"("note_id", "revision");

DO $$ BEGIN
  ALTER TABLE "issue_note_revisions"
    ADD CONSTRAINT "issue_note_revisions_note_id_fkey"
    FOREIGN KEY ("note_id") REFERENCES "issue_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "issue_note_revisions"
    ADD CONSTRAINT "issue_note_revisions_edited_by_id_fkey"
    FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "issue_note_revisions" ("id", "note_id", "revision", "title", "category", "content", "edited_by_id", "created_at")
SELECT gen_random_uuid()::text, "id", 1, "title", "category", "content", "author_id", "created_at"
FROM "issue_notes"
WHERE NOT EXISTS (
  SELECT 1 FROM "issue_note_revisions" WHERE "issue_note_revisions"."note_id" = "issue_notes"."id" AND "revision" = 1
);

ALTER TABLE "issue_attachments" ADD COLUMN IF NOT EXISTS "checksum_sha256" TEXT;
ALTER TABLE "issue_attachments" ADD COLUMN IF NOT EXISTS "purged_at" TIMESTAMP(3);
