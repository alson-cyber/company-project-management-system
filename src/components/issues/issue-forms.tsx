"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId } from "react";
import type { IssuePriority, IssueStatus } from "@/generated/prisma/enums";
import {
  addCriterionAction,
  archiveIssueAction,
  removeCriterionAction,
  restoreIssueAction,
  setLabelsAction,
  setStoryFieldsAction,
  updateCriterionAction,
  updateIssueAction,
  type IssueActionState,
} from "@/app/(app)/issues/actions";
import { Button, Spinner } from "@/components/ui/button";
import { Field, FormAlert, Select, TextArea, TextInput, describedBy } from "@/components/ui/field";
import { ISSUE_PRIORITIES, ISSUE_PRIORITY_LABELS, ISSUE_STATUSES, ISSUE_STATUS_LABELS } from "@/modules/issues/issue.constants";
import { calendarDayUtc } from "@/lib/calendar";
import type { AcceptanceCriterionView, IssueDetail } from "@/modules/issues/issue.queries";

function ActionStatus({ state }: { state: IssueActionState }) {
  if (!state) return null;
  if (!state.ok) return <FormAlert>{state.error.message}</FormAlert>;
  return <FormAlert tone="success">{state.data.changed === false ? "No changes to save." : "Saved."}</FormAlert>;
}

export function IssuePropertiesForm({
  issue,
  members,
}: {
  issue: IssueDetail;
  members: Array<{ id: string; name: string }>;
}) {
  const id = useId();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<IssueActionState, FormData>(async (previous, formData) => {
    const result = await updateIssueAction(previous, formData);
    if (result?.ok) router.refresh();
    return result;
  }, null);
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const dueValue = issue.dueDate ? calendarDayUtc(issue.dueDate) : "";

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="issueId" value={issue.id} />
      <input type="hidden" name="projectKey" value={issue.project.key} />
      <input type="hidden" name="issueNumber" value={String(issue.number)} />
      <ActionStatus state={state} />

      <Field id={`${id}-title`} label="Title" errors={fieldErrors?.title}>
        <TextInput
          id={`${id}-title`}
          name="title"
          defaultValue={issue.title}
          required
          aria-invalid={fieldErrors?.title ? true : undefined}
          aria-describedby={describedBy(`${id}-title`, fieldErrors?.title)}
        />
      </Field>
      <Field id={`${id}-description`} label="Description">
        <TextArea id={`${id}-description`} name="description" defaultValue={issue.description ?? ""} rows={4} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${id}-status`} label="Status">
          <Select id={`${id}-status`} name="status" defaultValue={issue.status}>
            {ISSUE_STATUSES.map((status: IssueStatus) => (
              <option key={status} value={status}>
                {ISSUE_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${id}-priority`} label="Priority">
          <Select id={`${id}-priority`} name="priority" defaultValue={issue.priority}>
            {ISSUE_PRIORITIES.map((priority: IssuePriority) => (
              <option key={priority} value={priority}>
                {ISSUE_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${id}-assignee`} label="Assignee">
          <Select id={`${id}-assignee`} name="assigneeId" defaultValue={issue.assignee?.id ?? ""}>
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${id}-due`} label="Due date">
          <TextInput id={`${id}-due`} name="dueDate" type="date" defaultValue={dueValue} />
        </Field>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function StoryFieldsForm({ issue }: { issue: NonNullable<IssueDetail["story"]> & Pick<IssueDetail, "id" | "number" | "project"> }) {
  const id = useId();
  const router = useRouter();
  const [state, formAction, pending] = useActionState<IssueActionState, FormData>(async (previous, formData) => {
    const result = await setStoryFieldsAction(previous, formData);
    if (result?.ok) router.refresh();
    return result;
  }, null);

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="issueId" value={issue.id} />
      <input type="hidden" name="projectKey" value={issue.project.key} />
      <input type="hidden" name="issueNumber" value={String(issue.number)} />
      <ActionStatus state={state} />
      <Field id={`${id}-asA`} label="As a">
        <TextInput id={`${id}-asA`} name="asA" defaultValue={issue.asA} required />
      </Field>
      <Field id={`${id}-iWant`} label="I want">
        <TextInput id={`${id}-iWant`} name="iWant" defaultValue={issue.iWant} required />
      </Field>
      <Field id={`${id}-soThat`} label="So that">
        <TextInput id={`${id}-soThat`} name="soThat" defaultValue={issue.soThat} required />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {pending ? "Saving…" : "Save story"}
        </Button>
      </div>
    </form>
  );
}

export function CriteriaManager({
  issueId,
  projectKey,
  issueNumber,
  criteria,
}: {
  issueId: string;
  projectKey: string;
  issueNumber: number;
  criteria: AcceptanceCriterionView[];
}) {
  const router = useRouter();
  const [addState, addAction, addPending] = useActionState<IssueActionState, FormData>(async (previous, formData) => {
    const result = await addCriterionAction(previous, formData);
    if (result?.ok) router.refresh();
    return result;
  }, null);

  return (
    <div className="grid gap-3">
      {criteria.length === 0 ? (
        <p className="text-sm text-warning">This User Story has no acceptance criteria yet.</p>
      ) : (
        <ul className="grid gap-2">
          {criteria.map((criterion) => (
            <li key={criterion.id} className="flex flex-wrap items-start gap-2 rounded-lg border border-line px-3 py-2">
              <form
                action={async (formData) => {
                  const result = await updateCriterionAction(null, formData);
                  if (result?.ok) router.refresh();
                }}
                className="flex flex-1 items-start gap-2"
              >
                <input type="hidden" name="criterionId" value={criterion.id} />
                <input type="hidden" name="projectKey" value={projectKey} />
                <input type="hidden" name="issueNumber" value={String(issueNumber)} />
                <input type="hidden" name="isMet" value={criterion.isMet ? "false" : "true"} />
                <Button type="submit" variant="secondary">
                  {criterion.isMet ? "Met" : "Not met"}
                </Button>
              </form>
              <p className="min-w-0 flex-1 text-sm">{criterion.text}</p>
              <form
                action={async (formData) => {
                  const result = await removeCriterionAction(null, formData);
                  if (result?.ok) router.refresh();
                }}
              >
                <input type="hidden" name="criterionId" value={criterion.id} />
                <input type="hidden" name="projectKey" value={projectKey} />
                <input type="hidden" name="issueNumber" value={String(issueNumber)} />
                <Button type="submit" variant="quiet">
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <form action={addAction} className="grid gap-2">
        <input type="hidden" name="issueId" value={issueId} />
        <input type="hidden" name="projectKey" value={projectKey} />
        <input type="hidden" name="issueNumber" value={String(issueNumber)} />
        {addState && !addState.ok ? <FormAlert>{addState.error.message}</FormAlert> : null}
        <TextInput name="text" placeholder="Add an acceptance criterion" required />
        <div>
          <Button type="submit" variant="secondary" disabled={addPending}>
            {addPending ? "Adding…" : "Add criterion"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function LabelsForm({ issue }: { issue: IssueDetail }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<IssueActionState, FormData>(async (previous, formData) => {
    const result = await setLabelsAction(previous, formData);
    if (result?.ok) router.refresh();
    return result;
  }, null);
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="issueId" value={issue.id} />
      <input type="hidden" name="projectKey" value={issue.project.key} />
      <input type="hidden" name="issueNumber" value={String(issue.number)} />
      <ActionStatus state={state} />
      <Field id="issue-labels" label="Labels" hint="Comma-separated names. Stored as project-scoped labels, not as a string on the issue.">
        <TextInput
          id="issue-labels"
          name="labels"
          defaultValue={issue.labels.map((label) => label.name).join(", ")}
        />
      </Field>
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save labels"}
        </Button>
      </div>
    </form>
  );
}

export function ArchiveRestoreForm({ issue }: { issue: IssueDetail }) {
  const router = useRouter();
  const [archiveState, archiveAction, archivePending] = useActionState<IssueActionState, FormData>(
    async (previous, formData) => {
      const result = await archiveIssueAction(previous, formData);
      if (result?.ok) router.refresh();
      return result;
    },
    null,
  );
  const [restoreState, restoreAction, restorePending] = useActionState<IssueActionState, FormData>(
    async (previous, formData) => {
      const result = await restoreIssueAction(previous, formData);
      if (result?.ok) router.refresh();
      return result;
    },
    null,
  );

  if (issue.archivedAt) {
    return (
      <form action={restoreAction} className="grid gap-2">
        <input type="hidden" name="issueId" value={issue.id} />
        <input type="hidden" name="projectKey" value={issue.project.key} />
        <input type="hidden" name="issueNumber" value={String(issue.number)} />
        <ActionStatus state={restoreState} />
        <Button type="submit" variant="secondary" disabled={restorePending}>
          Restore issue
        </Button>
      </form>
    );
  }

  return (
    <form
      action={archiveAction}
      className="grid gap-2"
      onSubmit={(event) => {
        if (!window.confirm("Archive this issue? Its history is kept and its key is not reused.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="issueId" value={issue.id} />
      <input type="hidden" name="projectKey" value={issue.project.key} />
      <ActionStatus state={archiveState} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="includeDescendants" className="size-4 rounded border-line" />
        Also archive descendant work
      </label>
      <Button type="submit" variant="secondary" disabled={archivePending}>
        Archive
      </Button>
    </form>
  );
}
