"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  archiveProjectAction,
  purgeAttachmentAction,
  restoreProjectAction,
  type AdminProjectState,
} from "./actions";

export function ArchiveProjectButton({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState<AdminProjectState, FormData>(archiveProjectAction, null);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Archive this project? It leaves day-to-day navigation. Its issues stay, and you can restore it here.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Archiving…" : "Archive"}
      </Button>
      {state && !state.ok ? <span className="ml-2 text-[13px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}

export function RestoreProjectButton({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState<AdminProjectState, FormData>(restoreProjectAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <Button type="submit" disabled={pending}>
        {pending ? "Restoring…" : "Restore"}
      </Button>
      {state && !state.ok ? <span className="ml-2 text-[13px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}

export function PurgeFileButton({ attachmentId }: { attachmentId: string }) {
  const [state, action, pending] = useActionState<AdminProjectState, FormData>(purgeAttachmentAction, null);
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Delete the stored file permanently? The removal record stays.")) event.preventDefault();
      }}
    >
      <input type="hidden" name="attachmentId" value={attachmentId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Purging…" : "Purge file"}
      </Button>
      {state && !state.ok ? <span className="ml-2 text-[13px] text-danger">{state.error.message}</span> : null}
    </form>
  );
}
