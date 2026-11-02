"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";
import { CreateIssueForm } from "@/components/issues/create-issue-form";
import { CREATE_EPIC_EVENT } from "@/components/shell/keyboard-shortcuts";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ISSUE_TYPE_STYLES,
  IssueStatusDot,
  IssueTypeIcon,
  IssueTypeLegend,
} from "@/components/ui/issue-badges";
import { cn } from "@/components/ui/cn";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatDate } from "@/components/ui/format";
import { calendarDayUtc } from "@/lib/calendar";
import {
  HIGH_PRIORITIES,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_TYPE_LABELS,
  ISSUE_TYPES,
} from "@/modules/issues/issue.constants";
import {
  EMPTY_ISSUE_FILTER,
  filterIssueTree,
  isFilterActive,
  parentIds,
  visibleIssueRows,
  type IssueTreeFilter,
} from "@/modules/issues/issue-tree.filter";
import type { IssueListItem } from "@/modules/issues/issue.queries";

const TREE_EVENT = "workhub-tree";

function useExpansion(projectId: string) {
  const key = `workhub:tree:${projectId}`;
  // null until after mount so the server and the first client render both show the tree open.
  const [stored, setStored] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    const read = () => {
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        setStored(null);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as unknown;
        setStored(parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : null);
      } catch {
        setStored(null);
      }
    };
    read();
    window.addEventListener(TREE_EVENT, read);
    return () => window.removeEventListener(TREE_EVENT, read);
  }, [key]);

  const write = (next: Record<string, boolean>) => {
    sessionStorage.setItem(key, JSON.stringify(next));
    setStored(next);
    window.dispatchEvent(new Event(TREE_EVENT));
  };

  return { stored: stored ?? {}, hasStored: stored !== null, write };
}

export function HierarchyWorkspace({
  projectId,
  projectKey,
  tree,
  progressPercent,
  members,
  canMutate,
  children,
}: {
  projectId: string;
  projectKey: string;
  tree: IssueListItem[];
  progressPercent: number;
  members: Array<{ id: string; name: string }>;
  canMutate: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Bumping this remounts the "Create epic" form already open, for the C shortcut and the command palette.
  const [createRequest, setCreateRequest] = useState(() => (searchParams.get("new") === "epic" ? 1 : 0));
  useEffect(() => {
    const requestCreate = () => setCreateRequest((count) => count + 1);
    window.addEventListener(CREATE_EPIC_EVENT, requestCreate);
    return () => window.removeEventListener(CREATE_EPIC_EVENT, requestCreate);
  }, []);
  const selectedNumber = Number(pathname.match(/\/issues\/(\d+)\/?$/)?.[1] ?? "");
  const selectedId = Number.isInteger(selectedNumber) ? findSelectedId(tree, selectedNumber) : null;
  const expansion = useExpansion(projectId);
  const [filter, setFilter] = useState<IssueTreeFilter>(EMPTY_ISSUE_FILTER);
  const [inspectorWidth, setInspectorWidth] = useState(360);
  const filtering = isFilterActive(filter);
  const visibleTree = useMemo(() => filterIssueTree(tree, filter), [tree, filter]);

  const isOpen = (id: string) => {
    if (filtering) return true;
    if (!expansion.hasStored) return true;
    return expansion.stored[id] ?? true;
  };

  const rows = visibleIssueRows(visibleTree, isOpen);

  const toggle = (id: string) => {
    const next = { ...expansion.stored };
    if (!expansion.hasStored) {
      for (const parentId of parentIds(tree)) next[parentId] = true;
    }
    next[id] = !isOpen(id);
    expansion.write(next);
  };

  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    for (const id of parentIds(tree)) next[id] = open;
    expansion.write(next);
  };

  const onTreeKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const current = document.activeElement?.closest<HTMLElement>("[data-issue-id]");
    const index = rows.findIndex((row) => row.node.id === current?.dataset.issueId);
    if (index < 0) return;
    const row = rows[index];
    if (!row) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusRow(rows[index + 1]?.node.id);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusRow(rows[index - 1]?.node.id);
    } else if (event.key === "ArrowRight" && row.node.children.length > 0) {
      event.preventDefault();
      if (!isOpen(row.node.id)) toggle(row.node.id);
      else focusRow(rows[index + 1]?.node.id);
    } else if (event.key === "ArrowLeft") {
      if (row.node.children.length > 0 && isOpen(row.node.id)) {
        event.preventDefault();
        toggle(row.node.id);
      } else if (row.node.parentId) {
        event.preventDefault();
        focusRow(row.node.parentId);
      }
    } else if (event.key === "Home") {
      event.preventDefault();
      focusRow(rows[0]?.node.id);
    } else if (event.key === "End") {
      event.preventDefault();
      focusRow(rows[rows.length - 1]?.node.id);
    }
  };

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[28rem] flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface lg:flex-row">
      <section className="@container flex min-w-0 flex-1 flex-col" aria-label="Issue hierarchy">
        <div
          className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5"
          role="region"
          aria-label="Issue filters"
        >
          <label className="relative min-w-[10rem] flex-1">
            <span className="sr-only">Search issues</span>
            <svg
              viewBox="0 0 16 16"
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              value={filter.query}
              onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))}
              placeholder="Search by key or title"
              className="h-8 w-full rounded-md border border-transparent bg-surface-2 pl-8 pr-3 text-sm text-ink transition-colors placeholder:text-muted-2 hover:border-line focus:border-line-strong focus:bg-surface"
            />
          </label>
          <FilterSelect
            label="Type"
            anyLabel="All types"
            value={filter.type}
            onChange={(type) => setFilter((current) => ({ ...current, type: type as IssueType | "" }))}
            options={ISSUE_TYPES.map((type) => ({ value: type, label: ISSUE_TYPE_LABELS[type] }))}
          />
          <FilterSelect
            label="Status"
            anyLabel="All statuses"
            value={filter.status}
            onChange={(status) =>
              setFilter((current) => ({ ...current, status: status as IssueStatus | "" }))
            }
            options={ISSUE_STATUSES.map((status) => ({ value: status, label: ISSUE_STATUS_LABELS[status] }))}
          />
          <FilterSelect
            label="Priority"
            anyLabel="All priorities"
            value={filter.priority}
            onChange={(priority) =>
              setFilter((current) => ({ ...current, priority: priority as IssuePriority | "" }))
            }
            options={ISSUE_PRIORITIES.map((priority) => ({
              value: priority,
              label: ISSUE_PRIORITY_LABELS[priority],
            }))}
          />
          <FilterSelect
            label="Assignee"
            anyLabel="Anyone"
            value={filter.assigneeId}
            onChange={(assigneeId) => setFilter((current) => ({ ...current, assigneeId }))}
            options={[
              { value: "unassigned", label: "Unassigned" },
              ...members.map((member) => ({ value: member.id, label: member.name })),
            ]}
          />
          {filtering ? (
            <button
              type="button"
              className="h-8 rounded-md px-2 text-[13px] font-medium text-muted hover:bg-surface-3 hover:text-ink"
              onClick={() => setFilter(EMPTY_ISSUE_FILTER)}
            >
              Reset
            </button>
          ) : null}
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <button
              type="button"
              aria-label="Expand all"
              title="Expand all"
              className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-ink"
              onClick={() => setAll(true)}
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                <path
                  d="M4.5 6 8 2.5 11.5 6M4.5 10 8 13.5 11.5 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Collapse all"
              title="Collapse all"
              className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-ink"
              onClick={() => setAll(false)}
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                <path
                  d="M4.5 2.5 8 6l3.5-3.5M4.5 13.5 8 10l3.5 3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {canMutate ? (
              <CreateIssueForm
                key={createRequest}
                projectId={projectId}
                type="EPIC"
                members={members}
                defaultOpen={createRequest > 0}
              />
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-[13px] text-muted">
          <p>
            Project progress {progressPercent}% from executable work.
            {filtering ? " Showing matches with their parent chain." : ""}
          </p>
          {filtering ? <p className="font-medium text-ink">Filters active</p> : <IssueTypeLegend />}
        </div>
        {visibleTree.length > 0 ? <ColumnHeader /> : null}
        {visibleTree.length === 0 ? (
          <EmptyState
            title={tree.length === 0 ? "No issues in this project yet." : "No issues match these filters."}
            illustration={tree.length === 0 ? "box" : undefined}
          >
            {tree.length === 0
              ? canMutate
                ? "Start by creating an epic, the big piece of work everything else sits under. Press C to begin."
                : "When the team adds epics and stories, they appear here."
              : "Try removing a filter, or reset them all."}
          </EmptyState>
        ) : (
          <ul
            role="tree"
            aria-label="Work breakdown"
            className="min-h-0 flex-1 overflow-auto pb-4"
            onKeyDown={onTreeKeyDown}
          >
            {rows.map((row, index) => (
              <TreeRow
                key={row.node.id}
                node={row.node}
                depth={row.depth}
                projectId={projectId}
                projectKey={projectKey}
                open={isOpen(row.node.id)}
                selected={selectedId === row.node.id}
                canMutate={canMutate}
                members={members}
                tabIndex={index === 0 ? 0 : -1}
                onToggle={() => toggle(row.node.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize inspector"
        className="hidden w-1.5 shrink-0 cursor-col-resize bg-line/80 hover:bg-accent/40 lg:block"
        onPointerDown={(event) => {
          event.preventDefault();
          const startX = event.clientX;
          const startWidth = inspectorWidth;
          const move = (pointer: PointerEvent) => {
            setInspectorWidth(Math.min(680, Math.max(320, startWidth - (pointer.clientX - startX))));
          };
          const stop = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", stop);
        }}
      />

      <aside
        aria-label="Issue inspector"
        className={cn(
          "min-h-0 w-full bg-surface lg:w-[var(--inspector)] lg:shrink-0 lg:overflow-y-auto lg:border-l lg:border-line",
          selectedId ? "fixed inset-0 z-40 overflow-y-auto lg:static" : "hidden lg:block",
        )}
        style={{ ["--inspector" as string]: `${inspectorWidth}px` }}
      >
        {children}
      </aside>
    </div>
  );
}

function findSelectedId(nodes: readonly IssueListItem[], number: number): string | null {
  for (const node of nodes) {
    if (node.number === number) return node.id;
    const child = findSelectedId(node.children, number);
    if (child) return child;
  }
  return null;
}

function focusRow(id: string | undefined) {
  if (!id) return;
  document.querySelector<HTMLElement>(`[data-issue-id="${id}"] a`)?.focus();
}

function TreeRow({
  node,
  depth,
  projectId,
  projectKey,
  open,
  selected,
  canMutate,
  members,
  tabIndex,
  onToggle,
}: {
  node: IssueListItem;
  depth: number;
  projectId: string;
  projectKey: string;
  open: boolean;
  selected: boolean;
  canMutate: boolean;
  members: Array<{ id: string; name: string }>;
  tabIndex: number;
  onToggle: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const done = node.status === "DONE";
  // All the work underneath is finished but nobody has closed this item yet. Status never changes on its own.
  const readyToClose =
    !done &&
    node.children.length > 0 &&
    node.progress.total > 0 &&
    node.progress.done === node.progress.total;
  return (
    <li
      role="treeitem"
      aria-level={depth + 1}
      aria-selected={selected}
      aria-expanded={node.children.length > 0 ? open : undefined}
      aria-label={`${ISSUE_TYPE_LABELS[node.type]} ${node.key} ${node.title}`}
      data-issue-id={node.id}
      className="relative"
    >
      <div
        className={cn(
          "group flex min-h-10 items-center gap-2 border-b border-line/70 pr-2 text-sm transition-colors duration-150",
          selected
            ? "bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent)]"
            : node.type === "EPIC"
              ? cn(ISSUE_TYPE_STYLES.EPIC.soft, "hover:brightness-[0.98] focus-within:brightness-[0.98]")
              : "hover:bg-surface-2 focus-within:bg-surface-2",
        )}
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        {Array.from({ length: depth }, (_, level) => (
          <span
            key={level}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 top-0 w-px bg-line"
            style={{ left: 22 + level * 20 }}
          />
        ))}
        {node.children.length > 0 ? (
          <button
            type="button"
            aria-label={open ? `Collapse ${node.key}` : `Expand ${node.key}`}
            className="relative z-[1] grid size-6 shrink-0 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink"
            onClick={onToggle}
          >
            <Chevron open={open} />
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        <IssueTypeIcon type={node.type} className={done ? "opacity-50" : undefined} />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href={`/projects/${projectKey}/issues/${node.number}`}
            scroll={false}
            tabIndex={tabIndex}
            className="flex min-w-0 flex-1 items-baseline gap-2 rounded py-2 focus-visible:outline-offset-4"
          >
            <span className="shrink-0 font-mono text-xs text-muted">{node.key}</span>
            <span
              className={cn(
                "min-w-0 truncate",
                done
                  ? "text-muted"
                  : node.type === "EPIC"
                    ? "font-semibold"
                    : node.type === "SUB_TASK"
                      ? "text-ink/85"
                      : "font-medium",
              )}
            >
              {node.title}
            </span>
          </Link>
          {node.overdue ? (
            <>
              <span
                className="size-2 shrink-0 rounded-full bg-danger @min-[48rem]:hidden"
                title="Overdue"
                aria-hidden="true"
              />
              <span className="sr-only @min-[48rem]:not-sr-only @min-[48rem]:shrink-0 @min-[48rem]:rounded-full @min-[48rem]:bg-danger-soft @min-[48rem]:px-2 @min-[48rem]:py-0.5 @min-[48rem]:text-[11px] @min-[48rem]:font-medium @min-[48rem]:text-danger">
                Overdue
              </span>
            </>
          ) : null}
          {readyToClose ? (
            <span
              className="hidden shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success @min-[50rem]:inline"
              title="Everything under this is done, but its own status is not Done yet."
            >
              Ready to close
            </span>
          ) : null}
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 text-xs font-medium @min-[28rem]:w-28",
            statusClass(node.status),
          )}
        >
          <IssueStatusDot status={node.status} className="size-1.5" />
          {ISSUE_STATUS_LABELS[node.status]}
        </span>
        <span
          className={cn(
            "hidden w-20 shrink-0 text-xs @min-[36rem]:inline",
            HIGH_PRIORITIES.has(node.priority) && !done ? "font-medium text-danger" : "text-muted",
          )}
        >
          {HIGH_PRIORITIES.has(node.priority) && !done ? "▲ " : ""}
          {ISSUE_PRIORITY_LABELS[node.priority]}
        </span>
        <span className="hidden w-28 shrink-0 items-center gap-1.5 @min-[54rem]:inline-flex">
          {node.assignee ? (
            <>
              <Avatar name={node.assignee.name} size="sm" className="size-6 text-[10px]" />
              <span className="truncate text-xs text-muted">{node.assignee.name.split(" ")[0]}</span>
            </>
          ) : (
            <span className="text-xs text-muted-2">Unassigned</span>
          )}
        </span>
        <span
          className={cn(
            "hidden w-24 shrink-0 text-xs tabular-nums @min-[62rem]:inline",
            node.overdue ? "text-danger" : "text-muted",
          )}
        >
          {node.dueDate ? formatDate(calendarDayUtc(node.dueDate)) : ""}
        </span>
        <span className="hidden w-20 shrink-0 items-center gap-1.5 @min-[44rem]:inline-flex">
          {node.children.length > 0 && node.progress.total > 0 ? (
            <>
              <ProgressRing
                percent={node.progress.percent}
                label={`${node.progress.done} of ${node.progress.total} done`}
              />
              <span className="text-xs tabular-nums text-muted">
                {node.progress.done}/{node.progress.total}
              </span>
            </>
          ) : null}
        </span>
        <span className="w-7 shrink-0">
          {canMutate && node.allowedChildType ? (
            <button
              type="button"
              className="grid size-7 place-items-center rounded text-muted opacity-60 transition-opacity hover:bg-surface-3 hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
              aria-label={`Add ${ISSUE_TYPE_LABELS[node.allowedChildType]}`}
              onClick={() => setCreating((value) => !value)}
            >
              +
            </button>
          ) : null}
        </span>
      </div>
      {creating && node.allowedChildType ? (
        <div className="border-b border-line bg-surface-2 px-4 py-3" style={{ paddingLeft: 36 + depth * 20 }}>
          <CreateIssueForm
            projectId={projectId}
            type={node.allowedChildType}
            parentId={node.id}
            members={members}
            defaultOpen
            onDismiss={() => setCreating(false)}
          />
        </div>
      ) : null}
    </li>
  );
}

/** Labels for the fixed columns, aligned with the cells in each row. */
function ColumnHeader() {
  return (
    <div
      aria-hidden="true"
      className="hidden items-center gap-2 border-y border-line/70 bg-surface-2 py-1.5 pl-[70px] pr-2 text-[11px] font-semibold uppercase tracking-wide text-muted @min-[28rem]:flex"
    >
      <span className="flex-1">Work</span>
      <span className="w-28 shrink-0">Status</span>
      <span className="hidden w-20 shrink-0 @min-[36rem]:inline">Priority</span>
      <span className="hidden w-28 shrink-0 @min-[54rem]:inline">Owner</span>
      <span className="hidden w-24 shrink-0 @min-[62rem]:inline">Due</span>
      <span className="hidden w-20 shrink-0 @min-[44rem]:inline">Progress</span>
      <span className="w-7 shrink-0" />
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-3.5 transition-transform", open ? "rotate-90" : "")}
      aria-hidden="true"
    >
      <path
        d="M6 3.5 11 8 6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function statusClass(status: IssueStatus): string {
  if (status === "DONE") return "text-success";
  if (status === "IN_PROGRESS") return "text-info";
  if (status === "IN_REVIEW") return "text-warning";
  return "text-muted";
}

function FilterSelect({
  label,
  anyLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  anyLabel: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-8 max-w-[10rem] cursor-pointer rounded-full border px-3 text-[13px] transition-colors",
        value
          ? "border-accent/30 bg-accent-soft font-medium text-ink"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
      )}
    >
      <option value="">{anyLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
