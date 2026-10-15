-- Planning start for the project timeline. created_at is not a plan date.
ALTER TABLE "issues" ADD COLUMN "planned_start_date" DATE;

ALTER TABLE "issues" ADD CONSTRAINT "issues_planned_start_before_due" CHECK (
  "planned_start_date" IS NULL
  OR "due_date" IS NULL
  OR "planned_start_date" <= "due_date"
);
