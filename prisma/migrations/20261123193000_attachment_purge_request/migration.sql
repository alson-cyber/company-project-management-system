-- Durable purge request. The audit row is written with this timestamp, before storage deletion.
ALTER TABLE "issue_attachments" ADD COLUMN "purge_requested_at" TIMESTAMP(3);
