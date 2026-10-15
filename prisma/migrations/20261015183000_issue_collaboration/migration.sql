-- Issue notes, comments, and attachments.
-- Archiving an issue does not delete these rows (ON DELETE RESTRICT, same as the rest of the issue graph).

-- CreateTable
CREATE TABLE "issue_notes" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "issue_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_comments" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "issue_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_attachments" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "uploaded_by_id" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "issue_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issue_notes_issue_id_deleted_at_created_at_idx" ON "issue_notes"("issue_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "issue_comments_issue_id_deleted_at_created_at_idx" ON "issue_comments"("issue_id", "deleted_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "issue_attachments_object_key_key" ON "issue_attachments"("object_key");

-- CreateIndex
CREATE INDEX "issue_attachments_issue_id_deleted_at_created_at_idx" ON "issue_attachments"("issue_id", "deleted_at", "created_at");

-- AddForeignKey
ALTER TABLE "issue_notes" ADD CONSTRAINT "issue_notes_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_notes" ADD CONSTRAINT "issue_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_comments" ADD CONSTRAINT "issue_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written integrity
-- ---------------------------------------------------------------------------

ALTER TABLE "issue_notes"
  ADD CONSTRAINT "issue_notes_content_nonblank" CHECK (btrim("content") <> '');

ALTER TABLE "issue_comments"
  ADD CONSTRAINT "issue_comments_body_nonblank" CHECK (btrim("body") <> '');

ALTER TABLE "issue_attachments"
  ADD CONSTRAINT "issue_attachments_filename_nonblank" CHECK (btrim("original_filename") <> '');

ALTER TABLE "issue_attachments"
  ADD CONSTRAINT "issue_attachments_size_positive" CHECK ("size_bytes" > 0);

ALTER TABLE "issue_attachments"
  ADD CONSTRAINT "issue_attachments_object_key_nonblank" CHECK (btrim("object_key") <> '');
