"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId, useState } from "react";
import type { IssueType } from "@/generated/prisma/enums";
import { createIssueAction, type IssueActionState } from "@/app/(app)/issues/actions";
import { Button, Spinner } from "@/components/ui/button";
import { Field, FormAlert, Select, TextArea, TextInput, describedBy } from "@/components/ui/field";
import { ISSUE_TYPE_LABELS } from "@/modules/issues/issue.constants";

export function CreateIssueForm({
  projectId,
  type,
  parentId,
  members,
  onCreated,
  compact = false,
  defaultOpen = false,
  onDismiss,
}: {
  projectId: string;
  type: IssueType;
  parentId?: string;
  members: Array<{ id: string; name: string }>;
  onCreated?: () => void;
  compact?: boolean;
  defaultOpen?: boolean;
  onDismiss?: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [state, formAction, pending] = useActionState<IssueActionState, FormData>(async (previous, formData) => {
    const result = await createIssueAction(previous, formData);
    if (result?.ok) {
      setOpen(false);
      onCreated?.();
      onDismiss?.();
      router.refresh();
    }
    return result;
  }, null);
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const label = ISSUE_TYPE_LABELS[type];

  if (!open) {
    if (compact) {
      return (
        <Button
          type="button"
          variant="quiet"
          className="size-7 px-0 text-base leading-none text-muted"
          aria-label={parentId ? `Add ${label}` : `Create ${label}`}
          onClick={() => setOpen(true)}
        >
          +
        </Button>
      );
    }
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {parentId ? `Add ${label}` : `Create ${label}`}
      </Button>
    );
  }

  return (
    <form action={formAction} className="grid gap-3 rounded-lg border border-line bg-surface-2 p-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="type" value={type} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}

      {state && !state.ok ? <FormAlert>{state.error.message}</FormAlert> : null}

      <Field id={`${id}-title`} label="Title" errors={fieldErrors?.title}>
        <TextInput
          id={`${id}-title`}
          name="title"
          required
          autoFocus
          aria-invalid={fieldErrors?.title ? true : undefined}
          aria-describedby={describedBy(`${id}-title`, fieldErrors?.title)}
        />
      </Field>

      {type === "USER_STORY" ? (
        <>
          <Field id={`${id}-asA`} label="As a" errors={fieldErrors?.["story.asA"] ?? fieldErrors?.asA}>
            <TextInput id={`${id}-asA`} name="asA" required placeholder="resort guest" />
          </Field>
          <Field id={`${id}-iWant`} label="I want" errors={fieldErrors?.["story.iWant"] ?? fieldErrors?.iWant}>
            <TextInput id={`${id}-iWant`} name="iWant" required placeholder="to book activities through a simple flow" />
          </Field>
          <Field id={`${id}-soThat`} label="So that" errors={fieldErrors?.["story.soThat"] ?? fieldErrors?.soThat}>
            <TextInput id={`${id}-soThat`} name="soThat" required placeholder="I can reserve without staff emails" />
          </Field>
          <Field id={`${id}-ac`} label="Acceptance criteria" hint="One criterion per line. Optional, but stories without criteria are flagged.">
            <TextArea id={`${id}-ac`} name="acceptanceCriteria" rows={3} />
          </Field>
        </>
      ) : null}

      <Field id={`${id}-assignee`} label="Assignee">
        <Select id={`${id}-assignee`} name="assigneeId" defaultValue="">
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {pending ? "Creating…" : `Create ${label}`}
        </Button>
        <Button
          type="button"
          variant="quiet"
          onClick={() => {
            setOpen(false);
            onDismiss?.();
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
