-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('EPIC', 'USER_STORY', 'TASK', 'SUB_TASK');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('LOWEST', 'LOW', 'MEDIUM', 'HIGH', 'HIGHEST');

-- AlterTable
ALTER TABLE "activity_events" ADD COLUMN "issue_id" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "next_issue_number" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "IssueType" NOT NULL,
    "parent_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'TO_DO',
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "assignee_id" TEXT,
    "reporter_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "due_date" DATE,
    "rank" TEXT NOT NULL DEFAULT 'a0',
    "completed_at" TIMESTAMP(3),
    "completed_by_id" TEXT,
    "archived_at" TIMESTAMP(3),
    "archived_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_story_details" (
    "issue_id" TEXT NOT NULL,
    "as_a" TEXT NOT NULL,
    "i_want" TEXT NOT NULL,
    "so_that" TEXT NOT NULL,

    CONSTRAINT "user_story_details_pkey" PRIMARY KEY ("issue_id")
);

-- CreateTable
CREATE TABLE "acceptance_criteria" (
    "id" TEXT NOT NULL,
    "issue_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_met" BOOLEAN NOT NULL DEFAULT false,
    "met_by_id" TEXT,
    "met_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "acceptance_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_labels" (
    "issue_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,

    CONSTRAINT "issue_labels_pkey" PRIMARY KEY ("issue_id","label_id")
);

-- CreateIndex
CREATE INDEX "issues_project_id_parent_id_idx" ON "issues"("project_id", "parent_id");

-- CreateIndex
CREATE INDEX "issues_project_id_type_idx" ON "issues"("project_id", "type");

-- CreateIndex
CREATE INDEX "issues_project_id_status_idx" ON "issues"("project_id", "status");

-- CreateIndex
CREATE INDEX "issues_project_id_archived_at_idx" ON "issues"("project_id", "archived_at");

-- CreateIndex
CREATE INDEX "issues_assignee_id_idx" ON "issues"("assignee_id");

-- CreateIndex
CREATE INDEX "issues_due_date_idx" ON "issues"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "issues_project_id_number_key" ON "issues"("project_id", "number");

-- CreateIndex
CREATE INDEX "acceptance_criteria_issue_id_deleted_at_idx" ON "acceptance_criteria"("issue_id", "deleted_at");

-- CreateIndex
CREATE INDEX "labels_project_id_idx" ON "labels"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "labels_project_id_name_key" ON "labels"("project_id", "name");

-- CreateIndex
CREATE INDEX "issue_labels_label_id_idx" ON "issue_labels"("label_id");

-- CreateIndex
CREATE INDEX "activity_events_issue_id_occurred_at_idx" ON "activity_events"("issue_id", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_completed_by_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_archived_by_id_fkey" FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_story_details" ADD CONSTRAINT "user_story_details_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_criteria" ADD CONSTRAINT "acceptance_criteria_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceptance_criteria" ADD CONSTRAINT "acceptance_criteria_met_by_id_fkey" FOREIGN KEY ("met_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_labels" ADD CONSTRAINT "issue_labels_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "labels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written integrity (not fully expressible in schema.prisma)
-- ---------------------------------------------------------------------------

ALTER TABLE "projects"
  ADD CONSTRAINT "projects_next_issue_number_positive" CHECK ("next_issue_number" >= 1);

ALTER TABLE "issues"
  ADD CONSTRAINT "issues_number_positive" CHECK ("number" > 0);

ALTER TABLE "issues"
  ADD CONSTRAINT "issues_epic_parent_null" CHECK (("type" = 'EPIC') = ("parent_id" IS NULL));

ALTER TABLE "user_story_details"
  ADD CONSTRAINT "user_story_details_nonblank"
  CHECK (btrim("as_a") <> '' AND btrim("i_want") <> '' AND btrim("so_that") <> '');

-- Parent type, same-project parent, and type-change vs children.
CREATE FUNCTION "issues_enforce_hierarchy"() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  parent_type "IssueType";
  parent_project_id TEXT;
  child_type "IssueType";
BEGIN
  IF NEW.parent_id IS NOT NULL AND NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Issue cannot be its own parent'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT "type", "project_id" INTO parent_type, parent_project_id
      FROM "issues" WHERE "id" = NEW.parent_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent issue not found'
        USING ERRCODE = 'foreign_key_violation';
    END IF;
    IF parent_project_id <> NEW.project_id THEN
      RAISE EXCEPTION 'Parent must belong to the same project'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.type = 'USER_STORY' AND parent_type <> 'EPIC' THEN
      RAISE EXCEPTION 'User Story parent must be an Epic'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.type = 'TASK' AND parent_type <> 'USER_STORY' THEN
      RAISE EXCEPTION 'Task parent must be a User Story'
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.type = 'SUB_TASK' AND parent_type <> 'TASK' THEN
      RAISE EXCEPTION 'Sub-task parent must be a Task'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.type <> NEW.type THEN
    FOR child_type IN SELECT "type" FROM "issues" WHERE "parent_id" = NEW.id LOOP
      IF NEW.type = 'EPIC' AND child_type <> 'USER_STORY' THEN
        RAISE EXCEPTION 'Cannot change type: children would be invalid'
          USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.type = 'USER_STORY' AND child_type <> 'TASK' THEN
        RAISE EXCEPTION 'Cannot change type: children would be invalid'
          USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.type = 'TASK' AND child_type <> 'SUB_TASK' THEN
        RAISE EXCEPTION 'Cannot change type: children would be invalid'
          USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.type = 'SUB_TASK' THEN
        RAISE EXCEPTION 'A Sub-task cannot have children'
          USING ERRCODE = 'check_violation';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "issues_hierarchy"
  BEFORE INSERT OR UPDATE OF "type", "parent_id", "project_id" ON "issues"
  FOR EACH ROW EXECUTE FUNCTION "issues_enforce_hierarchy"();

-- Labels can only be attached to issues in the same project.
CREATE FUNCTION "issue_labels_same_project"() RETURNS trigger
  LANGUAGE plpgsql AS $$
DECLARE
  issue_project TEXT;
  label_project TEXT;
BEGIN
  SELECT "project_id" INTO issue_project FROM "issues" WHERE "id" = NEW.issue_id;
  SELECT "project_id" INTO label_project FROM "labels" WHERE "id" = NEW.label_id;
  IF issue_project IS NULL OR label_project IS NULL OR issue_project <> label_project THEN
    RAISE EXCEPTION 'Label must belong to the same project as the issue'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "issue_labels_same_project"
  BEFORE INSERT OR UPDATE ON "issue_labels"
  FOR EACH ROW EXECUTE FUNCTION "issue_labels_same_project"();
