-- Personal attention records. Distinct from activity_events: read state may change,
-- and marking a notification read must never rewrite the audit log.

CREATE TYPE "NotificationType" AS ENUM (
  'ISSUE_ASSIGNED',
  'ISSUE_COMMENTED',
  'ISSUE_NOTE_ADDED',
  'ISSUE_STATUS_CHANGED',
  'ISSUE_DUE_SOON',
  'ISSUE_OVERDUE',
  'PROJECT_MEMBERSHIP'
);

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "recipient_id" TEXT NOT NULL,
  "actor_id" TEXT,
  "project_id" TEXT,
  "issue_id" TEXT,
  "type" "NotificationType" NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "metadata" JSONB,
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_recipient_id_dedupe_key_key" ON "notifications"("recipient_id", "dedupe_key");
CREATE INDEX "notifications_recipient_id_read_at_created_at_idx" ON "notifications"("recipient_id", "read_at", "created_at" DESC);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
