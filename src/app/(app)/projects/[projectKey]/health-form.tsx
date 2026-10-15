"use client";

import { useActionState, useId } from "react";
import type { ProjectHealth } from "@/generated/prisma/enums";
import { Button, Spinner } from "@/components/ui/button";
import { Field, FormAlert, Select, TextArea, describedBy } from "@/components/ui/field";
import { PROJECT_HEALTH_LABELS, PROJECT_HEALTH_STATES } from "@/modules/projects/project.constants";
import { setProjectHealthAction, type SetHealthState } from "./actions";

export function HealthForm({
  projectId,
  projectKey,
  health,
  note,
}: {
  projectId: string;
  projectKey: string;
  health: ProjectHealth | null;
  note: string | null;
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState<SetHealthState, FormData>(setProjectHealthAction, null);
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="projectKey" value={projectKey} />

      {state && !state.ok ? <FormAlert>{state.error.message}</FormAlert> : null}
      {state?.ok ? (
        <FormAlert tone="success">{state.data.changed ? "Health updated." : "No changes to save."}</FormAlert>
      ) : null}

      <Field id={`${id}-health`} label="Health" errors={fieldErrors?.health}>
        <Select
          id={`${id}-health`}
          name="health"
          defaultValue={health ?? ""}
          required
          aria-invalid={fieldErrors?.health ? true : undefined}
          aria-describedby={describedBy(`${id}-health`, fieldErrors?.health)}
        >
          <option value="" disabled>
            Choose a health state
          </option>
          {PROJECT_HEALTH_STATES.map((option) => (
            <option key={option} value={option}>
              {PROJECT_HEALTH_LABELS[option]}
            </option>
          ))}
        </Select>
      </Field>

      <Field id={`${id}-note`} label="Note" hint="Optional. Why this health state? Up to 500 characters." errors={fieldErrors?.note}>
        <TextArea
          id={`${id}-note`}
          name="note"
          defaultValue={note ?? ""}
          maxLength={500}
          rows={3}
          aria-invalid={fieldErrors?.note ? true : undefined}
          aria-describedby={describedBy(`${id}-note`, fieldErrors?.note, true)}
        />
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {pending ? "Saving…" : "Update health"}
        </Button>
      </div>
    </form>
  );
}
