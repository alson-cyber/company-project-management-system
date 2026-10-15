"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addCriterionAction,
  moveCriterionAction,
  removeCriterionAction,
  restoreCriterionAction,
  updateCriterionAction,
} from "@/app/(app)/issues/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import type { AcceptanceCriterionView } from "@/modules/issues/issue.queries";

export function CriteriaEditor({
  issueId,
  projectKey,
  issueNumber,
  criteria,
  canMutate,
}: {
  issueId: string;
  projectKey: string;
  issueNumber: number;
  criteria: AcceptanceCriterionView[];
  canMutate: boolean;
}) {
  const router = useRouter();
  const met = criteria.filter((criterion) => criterion.isMet).length;
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ id: string; text: string } | null>(null);
  const [draft, setDraft] = useState("");

  async function run(id: string, action: () => Promise<{ ok: boolean; message?: string }>) {
    setPendingId(id);
    setError(null);
    const result = await action();
    setPendingId(null);
    if (!result.ok) {
      setError(result.message ?? "Could not update the criterion.");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <section className="grid gap-2" aria-labelledby="acceptance-criteria-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="acceptance-criteria-heading" className="text-sm font-semibold">
          Acceptance criteria
        </h3>
        {criteria.length > 0 ? (
          <p className="text-[13px] text-muted">
            {met} / {criteria.length} met
          </p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
      {undo ? (
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted" role="status">
          Removed “{undo.text}”.
          <button
            type="button"
            className="font-semibold text-accent-strong"
            onClick={() => {
              const removed = undo;
              void run(removed.id, async () => {
                const result = await restoreCriterionAction(null, formFor(projectKey, issueNumber, { criterionId: removed.id }));
                if (result?.ok) setUndo(null);
                return { ok: Boolean(result?.ok), message: result && !result.ok ? result.error.message : undefined };
              });
            }}
          >
            Undo
          </button>
        </p>
      ) : null}
      {criteria.length === 0 ? <p className="text-sm text-muted">No acceptance criteria yet.</p> : null}
      <ul className="grid">
        {criteria.map((criterion, index) => (
          <CriterionRow
            key={criterion.id}
            criterion={criterion}
            index={index}
            total={criteria.length}
            canMutate={canMutate}
          pending={pendingId === criterion.id}
          onRemove={async () => {
              const ok = await run(criterion.id, async () => {
                const result = await removeCriterionAction(null, formFor(projectKey, issueNumber, { criterionId: criterion.id }));
                return { ok: Boolean(result?.ok), message: result && !result.ok ? result.error.message : undefined };
              });
              if (ok) setUndo({ id: criterion.id, text: criterion.text });
            }}
            onToggle={async () => {
              await run(criterion.id, async () => {
                const result = await updateCriterionAction(
                  null,
                  formFor(projectKey, issueNumber, {
                    criterionId: criterion.id,
                    isMet: criterion.isMet ? "false" : "true",
                  }),
                );
                return { ok: Boolean(result?.ok), message: result && !result.ok ? result.error.message : undefined };
              });
            }}
            onSaveText={async (text) => {
              if (text === criterion.text) return true;
              return run(criterion.id, async () => {
                const result = await updateCriterionAction(
                  null,
                  formFor(projectKey, issueNumber, { criterionId: criterion.id, text }),
                );
                return { ok: Boolean(result?.ok), message: result && !result.ok ? result.error.message : undefined };
              });
            }}
            onMove={async (direction) => {
              await run(criterion.id, async () => {
                const result = await moveCriterionAction(
                  null,
                  formFor(projectKey, issueNumber, { criterionId: criterion.id, direction }),
                );
                return { ok: Boolean(result?.ok), message: result && !result.ok ? result.error.message : undefined };
              });
            }}
          />
        ))}
      </ul>
      {canMutate ? (
        <form
          className="mt-1 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const text = draft.trim();
            if (!text) return;
            void run("new", async () => {
              const result = await addCriterionAction(null, formFor(projectKey, issueNumber, { issueId, text }));
              if (result?.ok) setDraft("");
              return { ok: Boolean(result?.ok), message: result && !result.ok ? result.error.message : undefined };
            });
          }}
        >
          <label className="sr-only" htmlFor="new-criterion">
            New acceptance criterion
          </label>
          <TextInput
            id="new-criterion"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a criterion"
          />
          <Button type="submit" variant="secondary" disabled={pendingId === "new" || draft.trim().length === 0}>
            {pendingId === "new" ? "Adding…" : "Add criterion"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}

function CriterionRow({
  criterion,
  index,
  total,
  canMutate,
  pending,
  onToggle,
  onSaveText,
  onMove,
  onRemove,
}: {
  criterion: AcceptanceCriterionView;
  index: number;
  total: number;
  canMutate: boolean;
  pending: boolean;
  onToggle: () => Promise<void>;
  onSaveText: (text: string) => Promise<boolean>;
  onMove: (direction: "up" | "down") => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(criterion.text);
  const [confirming, setConfirming] = useState(false);
  if (!editing && text !== criterion.text) setText(criterion.text);

  return (
    <li className="grid gap-2 border-b border-line py-2.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
      <input
        type="checkbox"
        className="mt-1 size-5 rounded border-line"
        checked={criterion.isMet}
        disabled={!canMutate || pending}
        aria-label={`${criterion.isMet ? "Met" : "Not met"}: ${criterion.text}`}
        onChange={() => void onToggle()}
      />
      <div className="min-w-0">
        {editing ? (
          <TextInput
            aria-label={`Edit criterion: ${criterion.text}`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => {
              void onSaveText(text.trim()).then((ok) => {
                if (ok) setEditing(false);
              });
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setText(criterion.text);
                setEditing(false);
              }
              if (event.key === "Enter") {
                event.preventDefault();
                void onSaveText(text.trim()).then((ok) => {
                  if (ok) setEditing(false);
                });
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="text-left text-sm leading-relaxed disabled:cursor-default"
            disabled={!canMutate}
            onClick={() => canMutate && setEditing(true)}
          >
            <span className={criterion.isMet ? "text-muted line-through decoration-line-strong" : undefined}>{criterion.text}</span>
            <span className="sr-only">{criterion.isMet ? ", met" : ", not met"}</span>
          </button>
        )}
        {canMutate ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Button type="button" variant="quiet" className="h-8 px-2" disabled={pending || index === 0} onClick={() => void onMove("up")}>
              Move up
            </Button>
            <Button
              type="button"
              variant="quiet"
              className="h-8 px-2"
              disabled={pending || index === total - 1}
              onClick={() => void onMove("down")}
            >
              Move down
            </Button>
            {confirming ? (
              <>
                <span className="px-1 text-[13px] text-muted">Remove this criterion?</span>
                <Button type="button" variant="secondary" className="h-8 px-2" disabled={pending} onClick={() => void onRemove()}>
                  Remove
                </Button>
                <Button type="button" variant="quiet" className="h-8 px-2" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button type="button" variant="quiet" className="h-8 px-2" onClick={() => setConfirming(true)}>
                Remove
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function formFor(projectKey: string, issueNumber: number, fields: Record<string, string>) {
  const form = new FormData();
  form.set("projectKey", projectKey);
  form.set("issueNumber", String(issueNumber));
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}
