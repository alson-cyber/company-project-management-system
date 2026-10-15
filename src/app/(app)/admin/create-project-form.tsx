"use client";

import { useActionState, useId } from "react";
import { Button, Spinner } from "@/components/ui/button";
import { Field, FormAlert, Select, TextArea, TextInput, describedBy } from "@/components/ui/field";
import { PROJECT_COLORS, PROJECT_STATUS_LABELS, PROJECT_STATUSES } from "@/modules/projects/project.constants";
import { createProjectAction, type CreateProjectState } from "./actions";

export function CreateProjectForm({
  leads,
}: {
  leads: { id: string; name: string; jobTitle: string | null }[];
}) {
  const id = useId();
  const [state, formAction, pending] = useActionState<CreateProjectState, FormData>(createProjectAction, null);
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;

  return (
    <form action={formAction} className="grid gap-4">
      {state && !state.ok ? <FormAlert>{state.error.message}</FormAlert> : null}
      {state?.ok ? <FormAlert tone="success">Created {state.data.key}. The lead is the first member.</FormAlert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-key`} label="Project key" hint="2–10 letters or digits, starting with a letter." errors={fieldErrors?.key}>
          <TextInput
            id={`${id}-key`}
            name="key"
            required
            autoCapitalize="characters"
            placeholder="AQUA"
            aria-invalid={fieldErrors?.key ? true : undefined}
            aria-describedby={describedBy(`${id}-key`, fieldErrors?.key, true)}
          />
        </Field>
        <Field id={`${id}-name`} label="Name" errors={fieldErrors?.name}>
          <TextInput
            id={`${id}-name`}
            name="name"
            required
            placeholder="AquaDesk"
            aria-invalid={fieldErrors?.name ? true : undefined}
            aria-describedby={describedBy(`${id}-name`, fieldErrors?.name)}
          />
        </Field>
      </div>

      <Field id={`${id}-description`} label="Description" errors={fieldErrors?.description}>
        <TextArea
          id={`${id}-description`}
          name="description"
          rows={3}
          aria-invalid={fieldErrors?.description ? true : undefined}
          aria-describedby={describedBy(`${id}-description`, fieldErrors?.description)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-lead`} label="Project lead" errors={fieldErrors?.leadUserId}>
          <Select
            id={`${id}-lead`}
            name="leadUserId"
            required
            defaultValue=""
            aria-invalid={fieldErrors?.leadUserId ? true : undefined}
            aria-describedby={describedBy(`${id}-lead`, fieldErrors?.leadUserId)}
          >
            <option value="" disabled>
              Choose a lead
            </option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
                {lead.jobTitle ? ` · ${lead.jobTitle}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${id}-status`} label="Status" errors={fieldErrors?.status}>
          <Select id={`${id}-status`} name="status" defaultValue="PLANNING">
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field id={`${id}-target`} label="Target date" errors={fieldErrors?.targetDate}>
          <TextInput id={`${id}-target`} name="targetDate" type="date" />
        </Field>
        <Field id={`${id}-color`} label="Colour" errors={fieldErrors?.color}>
          <Select id={`${id}-color`} name="color" defaultValue={PROJECT_COLORS[0] ?? "#4f6cf7"}>
            {PROJECT_COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {pending ? "Creating…" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
