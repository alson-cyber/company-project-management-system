"use client";

import { useActionState } from "react";
import { markAllReadAction, markReadAction, type InboxActionState } from "@/app/(app)/inbox/actions";

const initial: InboxActionState = {};

export function MarkAllRead() {
  const [state, action, pending] = useActionState(markAllReadAction, initial);
  return (
    <form action={action} className="flex items-center gap-2">
      <button type="submit" disabled={pending} className="text-[13px] font-semibold text-accent-strong hover:underline disabled:opacity-60">
        {pending ? "Marking…" : "Mark all read"}
      </button>
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function MarkRead({ id }: { id: string }) {
  const [state, action, pending] = useActionState(markReadAction, initial);
  return (
    <form action={action}>
      <input type="hidden" name="notificationId" value={id} />
      <button type="submit" disabled={pending} className="text-xs font-semibold text-muted hover:text-ink hover:underline disabled:opacity-60">
        {pending ? "Saving…" : "Mark read"}
      </button>
      {state.error ? (
        <span role="alert" className="ml-2 text-xs text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
