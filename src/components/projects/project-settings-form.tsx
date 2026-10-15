"use client";

import { useActionState, useId } from "react";
import type { ProjectStatus } from "@/generated/prisma/enums";
import { Button, Spinner } from "@/components/ui/button";
import { Field, FormAlert, Select, TextArea, TextInput, describedBy } from "@/components/ui/field";
import { calendarDayUtc } from "@/lib/calendar";
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES } from "@/modules/projects/project.constants";
import { updateProjectAction, type UpdateProjectState } from "@/app/(app)/projects/[projectKey]/actions";

export function ProjectSettingsForm({
  projectId,
  projectKey,
  name,
  description,
  status,
  targetDate,
}: {
  projectId: string;
  projectKey: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  targetDate: Date | null;
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState<UpdateProjectState, FormData>(updateProjectAction, null);
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="projectKey" value={projectKey} />
      {state && !state.ok ? <FormAlert>{state.error.message}</FormAlert> : null}
      {state?.ok ? (
        <FormAlert tone="success">{state.data.changed ? "Project updated." : "No changes to save."}</FormAlert>
      ) : null}
      <Field id={`${id}-name`} label="Name" errors={fieldErrors?.name}>
        <TextInput id={`${id}-name`} name="name" defaultValue={name} required maxLength={80} />
      </Field>
      <Field id={`${id}-description`} label="Description" errors={fieldErrors?.description}>
        <TextArea id={`${id}-description`} name="description" defaultValue={description ?? ""} rows={3} maxLength={2000} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${id}-status`} label="Status" errors={fieldErrors?.status}>
          <Select
            id={`${id}-status`}
            name="status"
            defaultValue={status}
            aria-invalid={fieldErrors?.status ? true : undefined}
            aria-describedby={describedBy(`${id}-status`, fieldErrors?.status)}
          >
            {PROJECT_STATUSES.map((option) => (
              <option key={option} value={option}>
                {PROJECT_STATUS_LABELS[option]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${id}-target`} label="Target date" errors={fieldErrors?.targetDate}>
          <TextInput
            id={`${id}-target`}
            name="targetDate"
            type="date"
            defaultValue={targetDate ? calendarDayUtc(targetDate) : ""}
          />
        </Field>
      </div>
      <p className="text-xs text-muted">The project key {projectKey} stays fixed so existing issue keys do not change.</p>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {pending ? "Saving…" : "Save project"}
        </Button>
      </div>
    </form>
  );
}
