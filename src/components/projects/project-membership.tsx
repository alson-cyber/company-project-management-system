"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert, Select } from "@/components/ui/field";
import {
  addProjectMemberAction,
  removeProjectMemberAction,
  transferProjectLeadAction,
  type MembershipState,
} from "@/app/(app)/projects/[projectKey]/actions";

export function ProjectMembership({
  projectId,
  projectKey,
  candidates,
  members,
}: {
  projectId: string;
  projectKey: string;
  candidates: { id: string; name: string }[];
  members: { userId: string; name: string; role: "LEAD" | "MEMBER" }[];
}) {
  const [addState, addAction, addPending] = useActionState<MembershipState, FormData>(addProjectMemberAction, null);
  const [leadState, leadAction, leadPending] = useActionState<MembershipState, FormData>(transferProjectLeadAction, null);
  const transferable = members.filter((member) => member.role !== "LEAD");

  return (
    <div className="mb-6 grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div>
        <h2 className="text-sm font-semibold">Team setup</h2>
        <p className="text-[13px] text-muted">Add people, transfer the lead, then remove someone who has left the work.</p>
      </div>
      <form action={addAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="projectKey" value={projectKey} />
        <label className="grid gap-1 text-[13px] font-medium">
          Add a person
          <Select name="userId" required defaultValue="" className="h-9 min-w-48">
            <option value="" disabled>
              {candidates.length === 0 ? "Everyone is already here" : "Choose a person"}
            </option>
            {candidates.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" disabled={addPending || candidates.length === 0}>
          {addPending ? "Adding…" : "Add member"}
        </Button>
      </form>
      {addState && !addState.ok ? <FormAlert>{addState.error.message}</FormAlert> : null}
      <form action={leadAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="projectKey" value={projectKey} />
        <label className="grid gap-1 text-[13px] font-medium">
          New lead
          <Select name="userId" required defaultValue="" className="h-9 min-w-48">
            <option value="" disabled>
              {transferable.length === 0 ? "Add a member first" : "Choose a member"}
            </option>
            {transferable.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="secondary" disabled={leadPending || transferable.length === 0}>
          {leadPending ? "Transferring…" : "Transfer lead"}
        </Button>
      </form>
      {leadState && !leadState.ok ? <FormAlert>{leadState.error.message}</FormAlert> : null}
    </div>
  );
}

export function RemoveMemberButton({
  projectId,
  projectKey,
  userId,
  name,
}: {
  projectId: string;
  projectKey: string;
  userId: string;
  name: string;
}) {
  const [state, action, pending] = useActionState<MembershipState, FormData>(removeProjectMemberAction, null);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="projectKey" value={projectKey} />
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" className="text-[13px] font-semibold text-muted hover:text-danger" disabled={pending}>
        {pending ? "Removing…" : `Remove ${name}`}
      </button>
      {state && !state.ok ? <span className="ml-2 text-[13px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}
