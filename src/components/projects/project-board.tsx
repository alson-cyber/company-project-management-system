"use client";

import { startTransition, useOptimistic, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { patchIssueAction } from "@/app/(app)/issues/actions";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ISSUE_TYPE_STYLES, IssuePriorityBadge, IssueStatusDot, IssueTypeBadge } from "@/components/ui/issue-badges";
import { cn } from "@/components/ui/cn";
import { ISSUE_STATUS_LABELS } from "@/modules/issues/issue.constants";
import { BOARD_COLUMNS, type BoardCard, type BoardGroup } from "@/modules/projects/workspace.model";
import type { IssueStatus } from "@/generated/prisma/enums";
import { formatDate } from "@/components/ui/format";

export function ProjectBoard({
  projectKey,
  groups,
  canMutate,
}: {
  projectKey: string;
  groups: BoardGroup[];
  canMutate: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  // The card moves on screen straight away. If saving fails, React drops this
  // optimistic state when the transition ends and the card returns to its column.
  const [shownGroups, moveOptimistically] = useOptimistic(
    groups,
    (current: BoardGroup[], change: { id: string; status: IssueStatus }) =>
      current.map((group) => ({
        ...group,
        cards: group.cards.map((card) => (card.id === change.id ? { ...card, status: change.status } : card)),
      })),
  );
  const cards = new Map(shownGroups.flatMap((group) => group.cards.map((card) => [card.id, card] as const)));

  /**
   * Dragging moves the card at once (optimistic). The keyboard "Move" control waits for the
   * save to be confirmed, so the card only lands in its new column once the change is stored.
   */
  function move(card: BoardCard, status: IssueStatus, optimistic: boolean) {
    if (!canMutate || card.status === status || pendingId) return;
    setPendingId(card.id);
    setError(null);
    startTransition(async () => {
      if (optimistic) moveOptimistically({ id: card.id, status });
      const form = new FormData();
      form.set("issueId", card.id);
      form.set("projectKey", projectKey);
      form.set("issueNumber", String(card.number));
      form.set("status", status);
      const result = await patchIssueAction(null, form);
      setPendingId(null);
      if (!result?.ok) {
        setError(result?.error.message ?? "The status could not be saved.");
        return;
      }
      if (status === "DONE") setCelebrateId(card.id);
      router.refresh();
    });
  }

  function onDrop(status: IssueStatus, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setOver(null);
    const id = event.dataTransfer.getData("text/plain");
    const card = cards.get(id);
    if (card) move(card, status, true);
  }

  return (
    <div className="grid min-w-0 gap-4">
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      {shownGroups.length === 0 || shownGroups.every((group) => group.cards.length === 0) ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface shadow-card">
          <EmptyState title="No tasks or sub-tasks match." illustration="box">
            The board shows tasks and sub-tasks. Add them under a user story, or loosen the filters.
          </EmptyState>
        </div>
      ) : null}
      {shownGroups.map((group) => (
        <section key={group.id} aria-label={group.title ?? "Board"} className="grid gap-2">
          {group.title ? <h2 className="text-sm font-semibold">{group.title}</h2> : null}
          <div className="flex min-w-0 max-w-full gap-3 overflow-x-auto pb-2 [contain:inline-size]">
            {BOARD_COLUMNS.map((status) => {
              const column = group.cards.filter((card) => card.status === status);
              const dropId = `${group.id}:${status}`;
              return (
                <section
                  key={status}
                  aria-label={ISSUE_STATUS_LABELS[status]}
                  className={cn(
                    "flex w-72 shrink-0 flex-col rounded-[var(--radius-card)] border bg-surface-2",
                    over === dropId ? "border-accent" : "border-transparent",
                  )}
                  onDragOver={(event) => {
                    if (!canMutate) return;
                    event.preventDefault();
                    setOver(dropId);
                  }}
                  onDragLeave={() => setOver((current) => (current === dropId ? null : current))}
                  onDrop={(event) => onDrop(status, event)}
                >
                  <header className="flex items-center justify-between px-3 pt-2.5 pb-1">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                      <IssueStatusDot status={status} />
                      {ISSUE_STATUS_LABELS[status]}
                    </h3>
                    <span className="text-xs tabular-nums text-muted">{column.length}</span>
                  </header>
                  <ul className="grid min-h-16 content-start gap-2 p-2">
                    {column.length === 0 ? <li className="px-1 py-3 text-xs text-muted">None</li> : null}
                    {column.map((card) => (
                      <li key={card.id}>
                        <BoardCardView
                          card={card}
                          canMutate={canMutate}
                          pending={pendingId === card.id}
                          celebrate={celebrateId === card.id && card.status === "DONE"}
                          onMove={(next) => move(card, next, false)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function BoardCardView({
  card,
  canMutate,
  pending,
  celebrate,
  onMove,
}: {
  card: BoardCard;
  canMutate: boolean;
  pending: boolean;
  celebrate: boolean;
  onMove: (status: IssueStatus) => void;
}) {
  const context = card.storyTitle ?? card.epicTitle;
  return (
    <article
      aria-label={`${card.type === "SUB_TASK" ? "Sub-task" : "Task"} ${card.key} ${card.title}`}
      draggable={canMutate && !pending}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", card.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group grid gap-1.5 rounded-lg border border-l-[3px] border-line bg-surface px-3 py-2.5 shadow-card transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-lift focus-within:border-accent",
        ISSUE_TYPE_STYLES[card.type].stripe,
        celebrate ? "animate-done-glow" : null,
        pending ? "opacity-80" : null,
      )}
    >
      {context ? <p className="truncate text-[11px] font-medium text-muted">{context}</p> : null}
      <div className="flex items-center justify-between gap-2">
        <IssueTypeBadge type={card.type} short />
        <p className="font-mono text-[11px] text-muted">{card.key}</p>
      </div>
      <h3 className="text-sm font-medium leading-snug">{card.title}</h3>
      {card.parentTitle ? <p className="truncate text-xs text-muted">In {card.parentTitle}</p> : null}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <IssuePriorityBadge priority={card.priority} />
        {card.assigneeName ? (
          <span className="inline-flex items-center gap-1 text-muted">
            <Avatar name={card.assigneeName} size="sm" />
            <span className="sr-only">Assignee </span>
            {card.assigneeName}
          </span>
        ) : (
          <span className="text-muted">Unassigned</span>
        )}
        {card.dueDate ? (
          <span className={card.overdue ? "font-semibold text-danger" : "text-muted"}>
            {card.overdue ? "Overdue " : "Due "}
            {formatDate(card.dueDate)}
          </span>
        ) : null}
      </div>
      {pending ? <p className="text-xs text-muted">Saving…</p> : null}
      {celebrate ? (
        <p role="status" className="flex items-center gap-1.5 text-xs font-medium text-success">
          <span className="grid size-4 animate-pop place-items-center rounded-full bg-success text-white" aria-hidden="true">
            <svg viewBox="0 0 16 16" className="size-2.5">
              <path d="m3.5 8.4 3 3 6-6.6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Done. Nice work!
        </p>
      ) : null}
      {canMutate ? (
        <form
          className="mt-0.5 flex items-center gap-1 opacity-70 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
          onSubmit={(event) => {
            event.preventDefault();
            const status = new FormData(event.currentTarget).get("status");
            if (typeof status === "string") onMove(status as IssueStatus);
          }}
        >
          <label className="sr-only" htmlFor={`move-${card.id}`}>
            Move {card.key} to
          </label>
          <select id={`move-${card.id}`} name="status" defaultValue="" className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-surface-2 px-1 text-xs text-muted hover:border-line focus:border-line">
            <option value="" disabled>
              Move to…
            </option>
            {BOARD_COLUMNS.filter((status) => status !== card.status).map((status) => (
              <option key={status} value={status}>
                {ISSUE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button type="submit" className="h-7 rounded-md px-2 text-xs font-medium text-muted hover:bg-surface-3 hover:text-ink">
            Move
          </button>
        </form>
      ) : null}
    </article>
  );
}
