"use client";

import { useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { patchIssueAction } from "@/app/(app)/issues/actions";
import { Avatar } from "@/components/ui/avatar";
import { IssuePriorityBadge, IssueTypeBadge } from "@/components/ui/issue-badges";
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
  const cards = new Map(groups.flatMap((group) => group.cards.map((card) => [card.id, card] as const)));

  async function move(card: BoardCard, status: IssueStatus) {
    if (!canMutate || card.status === status || pendingId) return;
    setPendingId(card.id);
    setError(null);
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
    router.refresh();
  }

  function onDrop(status: IssueStatus, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setOver(null);
    const id = event.dataTransfer.getData("text/plain");
    const card = cards.get(id);
    if (card) void move(card, status);
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      {groups.length === 0 || groups.every((group) => group.cards.length === 0) ? (
        <p className="text-sm text-muted">No tasks or sub-tasks match.</p>
      ) : null}
      {groups.map((group) => (
        <section key={group.id} aria-label={group.title ?? "Board"} className="grid gap-2">
          {group.title ? <h2 className="text-sm font-semibold">{group.title}</h2> : null}
          <div className="flex gap-3 overflow-x-auto pb-2">
            {BOARD_COLUMNS.map((status) => {
              const column = group.cards.filter((card) => card.status === status);
              const dropId = `${group.id}:${status}`;
              return (
                <section
                  key={status}
                  aria-label={ISSUE_STATUS_LABELS[status]}
                  className={`flex w-72 shrink-0 flex-col border bg-surface-2/40 ${over === dropId ? "border-accent" : "border-line"}`}
                  onDragOver={(event) => {
                    if (!canMutate) return;
                    event.preventDefault();
                    setOver(dropId);
                  }}
                  onDragLeave={() => setOver((current) => (current === dropId ? null : current))}
                  onDrop={(event) => onDrop(status, event)}
                >
                  <header className="flex items-baseline justify-between border-b border-line px-3 py-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{ISSUE_STATUS_LABELS[status]}</h3>
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
                          onMove={(next) => void move(card, next)}
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
  onMove,
}: {
  card: BoardCard;
  canMutate: boolean;
  pending: boolean;
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
      className="grid gap-1.5 border border-line bg-surface px-3 py-2.5 focus-within:border-accent"
    >
      {context ? <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{context}</p> : null}
      <p className="font-mono text-xs font-semibold text-muted">{card.key}</p>
      <h3 className="text-sm font-medium leading-snug">{card.title}</h3>
      {card.parentTitle ? <p className="truncate text-xs text-muted">In {card.parentTitle}</p> : null}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <IssueTypeBadge type={card.type} />
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
      {pending ? <p className="text-xs text-muted">Saving status…</p> : null}
      {canMutate ? (
        <form
          className="mt-1 flex items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            const status = new FormData(event.currentTarget).get("status");
            if (typeof status === "string") onMove(status as IssueStatus);
          }}
        >
          <label className="sr-only" htmlFor={`move-${card.id}`}>
            Move {card.key} to
          </label>
          <select id={`move-${card.id}`} name="status" defaultValue="" className="h-8 min-w-0 flex-1 border border-line bg-surface px-1 text-xs">
            <option value="" disabled>
              Move to…
            </option>
            {BOARD_COLUMNS.filter((status) => status !== card.status).map((status) => (
              <option key={status} value={status}>
                {ISSUE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button type="submit" className="h-8 px-2 text-xs font-semibold text-accent-strong hover:underline">
            Move
          </button>
        </form>
      ) : null}
    </article>
  );
}
