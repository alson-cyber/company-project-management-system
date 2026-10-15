"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { archiveIssueAction, restoreIssueAction, type IssueActionState } from "@/app/(app)/issues/actions";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import type { IssueDetail } from "@/modules/issues/issue.queries";

function ActionStatus({ state }: { state: IssueActionState }) {
  if (!state) return null;
  if (!state.ok) return <FormAlert>{state.error.message}</FormAlert>;
  return <FormAlert tone="success">{state.data.changed === false ? "No changes to save." : "Saved."}</FormAlert>;
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
