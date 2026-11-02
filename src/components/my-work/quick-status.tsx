"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { IssueStatus } from "@/generated/prisma/enums";
import { patchIssueAction } from "@/app/(app)/issues/actions";
import { cn } from "@/components/ui/cn";

/**
 * One-click status change from a list row: "Start" for work that is To Do,
 * "Mark done" for work in progress or in review. Uses the same server action as the
 * issue panel, so permissions, history and notifications are unchanged.
 */
export function QuickStatus({
  issueId,
  projectKey,
  issueNumber,
  issueKey,
  status,
}: {
  issueId: string;
  projectKey: string;
  issueNumber: number;
  issueKey: string;
  status: IssueStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<"done" | "started" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status === "DONE") return null;
  const next: IssueStatus = status === "TO_DO" ? "IN_PROGRESS" : "DONE";
  const label = next === "DONE" ? "Mark done" : "Start";

  if (result === "done") {
    return (
      <span role="status" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-success">
        <span className="grid size-4 animate-pop place-items-center rounded-full bg-success text-surface" aria-hidden="true">
          <svg viewBox="0 0 16 16" className="size-2.5">
            <path
              d="m3.5 8.4 3 3 6-6.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        Done. Nice work!
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      {error ? (
        <span role="alert" className="max-w-48 truncate text-xs text-danger" title={error}>
          {error}
        </span>
      ) : null}
      <button
        type="button"
        disabled={pending}
        aria-label={`${label}: ${issueKey}`}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const form = new FormData();
            form.set("issueId", issueId);
            form.set("projectKey", projectKey);
            form.set("issueNumber", String(issueNumber));
            form.set("status", next);
            const response = await patchIssueAction(null, form);
            if (!response?.ok) {
              setError(response?.error.message ?? "Could not update the status.");
              return;
            }
            setResult(next === "DONE" ? "done" : "started");
            router.refresh();
          });
        }}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:opacity-60",
          next === "DONE"
            ? "border-success/30 bg-success-soft text-success hover:border-success/60"
            : "border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2",
        )}
      >
        {pending ? "Saving…" : label}
        {!pending && next === "IN_PROGRESS" ? <span aria-hidden="true">→</span> : null}
      </button>
    </span>
  );
}
