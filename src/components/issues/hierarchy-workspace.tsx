"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";
import { CreateIssueForm } from "@/components/issues/create-issue-form";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/field";
import { calendarDayUtc } from "@/lib/calendar";
import {
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
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Issue hierarchy">
        <div className="flex flex-wrap items-end gap-2 border-b border-line px-3 py-3" role="region" aria-label="Issue filters">
          <label className="grid min-w-[12rem] flex-1 gap-1 text-xs font-medium text-muted">
            Search issues
            <input
              value={filter.query}
              onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))}
              placeholder="Key or title"
              className="h-9 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
            />
          </label>
          <FilterSelect
            label="Type"
            value={filter.type}
            onChange={(type) => setFilter((current) => ({ ...current, type: type as IssueType | "" }))}
            options={ISSUE_TYPES.map((type) => ({ value: type, label: ISSUE_TYPE_LABELS[type] }))}
          />
          <FilterSelect
            label="Status"
            value={filter.status}
            onChange={(status) => setFilter((current) => ({ ...current, status: status as IssueStatus | "" }))}
            options={ISSUE_STATUSES.map((status) => ({ value: status, label: ISSUE_STATUS_LABELS[status] }))}
          />
          <FilterSelect
            label="Priority"
            value={filter.priority}
            onChange={(priority) => setFilter((current) => ({ ...current, priority: priority as IssuePriority | "" }))}
            options={ISSUE_PRIORITIES.map((priority) => ({ value: priority, label: ISSUE_PRIORITY_LABELS[priority] }))}
          />
          <FilterSelect
            label="Assignee"
            value={filter.assigneeId}
            onChange={(assigneeId) => setFilter((current) => ({ ...current, assigneeId }))}
            options={[
              { value: "unassigned", label: "Unassigned" },
              ...members.map((member) => ({ value: member.id, label: member.name })),
            ]}
          />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button type="button" className="h-9 px-2 text-[13px] font-medium text-muted hover:text-ink" onClick={() => setAll(true)}>
              Expand all
            </button>
            <button type="button" className="h-9 px-2 text-[13px] font-medium text-muted hover:text-ink" onClick={() => setAll(false)}>
              Collapse all
            </button>
            {canMutate ? <CreateIssueForm projectId={projectId} type="EPIC" members={members} /> : null}
          </div>
        </div>
        <p className="px-4 py-2 text-[13px] text-muted">
          Project progress {progressPercent}% from executable work.
          {filtering ? " Showing matches with their parent chain." : ""}
        </p>
        {filtering ? (
          <div className="flex items-center gap-3 px-4 pb-2">
            <p className="text-[13px] font-medium">Filters active</p>
            <button
              type="button"
              className="text-[13px] font-medium text-accent-strong"
              onClick={() => setFilter(EMPTY_ISSUE_FILTER)}
            >
              Reset
            </button>
          </div>
        ) : null}
        {visibleTree.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted">
            {tree.length === 0 ? "No issues in this project yet." : "No issues match these filters."}
          </p>
        ) : (
          <ul role="tree" aria-label="Work breakdown" className="min-h-0 flex-1 overflow-auto pb-4" onKeyDown={onTreeKeyDown}>
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
          "group flex min-h-10 items-center gap-2 border-b border-line/70 pr-2 text-sm",
          selected
            ? "bg-accent-soft shadow-[inset_2px_0_0_var(--color-accent)]"
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
        <TypeMark type={node.type} />
        <Link
          href={`/projects/${projectKey}/issues/${node.number}`}
          scroll={false}
          tabIndex={tabIndex}
          className="flex min-w-0 flex-1 items-baseline gap-2 rounded py-2 focus-visible:outline-offset-4"
        >
          <span className="shrink-0 font-mono text-xs text-muted">{node.key}</span>
          <span className="min-w-0 font-medium max-lg:truncate lg:whitespace-normal">{node.title}</span>
        </Link>
        <span className={cn("shrink-0 text-xs font-semibold", statusClass(node.status))}>{ISSUE_STATUS_LABELS[node.status]}</span>
        <span className="hidden shrink-0 text-xs text-muted md:inline">{ISSUE_PRIORITY_LABELS[node.priority]}</span>
        <span className="hidden shrink-0 lg:inline">
          {node.assignee ? (
            <Avatar name={node.assignee.name} size="sm" className="size-6 text-xs" />
          ) : (
            <span className="text-xs text-muted-2">Unassigned</span>
          )}
        </span>
        {node.dueDate ? (
          <span
            className={cn(
              "shrink-0 text-xs",
              node.overdue ? "font-semibold text-danger max-lg:hidden" : "hidden text-muted 2xl:inline",
            )}
          >
            {node.overdue ? "Overdue" : calendarDayUtc(node.dueDate)}
          </span>
        ) : null}
        {node.type === "EPIC" || node.type === "USER_STORY" ? (
          <span className="hidden w-10 shrink-0 text-right text-xs tabular-nums text-muted md:inline">
            {node.progress.total > 0 ? `${node.progress.percent}%` : ""}
          </span>
        ) : (
          <span className="hidden w-10 md:inline" />
        )}
        {canMutate && node.allowedChildType ? (
          <span className="shrink-0">
            <button
              type="button"
              className="grid size-7 place-items-center rounded text-muted hover:bg-surface-3 hover:text-ink"
              aria-label={`Add ${ISSUE_TYPE_LABELS[node.allowedChildType]}`}
              onClick={() => setCreating((value) => !value)}
            >
              +
            </button>
          </span>
        ) : null}
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={cn("size-3.5 transition-transform", open ? "rotate-90" : "")} aria-hidden="true">
      <path d="M6 3.5 11 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TypeMark({ type }: { type: IssueType }) {
  const tone =
    type === "EPIC" ? "text-purple" : type === "USER_STORY" ? "text-teal" : type === "TASK" ? "text-accent" : "text-muted";
  return (
    <span className={cn("grid size-5 shrink-0 place-items-center", tone)} title={ISSUE_TYPE_LABELS[type]}>
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        {type === "EPIC" ? <path d="M8 1.5 14 8 8 14.5 2 8z" fill="currentColor" /> : null}
        {type === "USER_STORY" ? <path d="M3 3.5h10v7.2L8 13.5 3 10.7z" fill="currentColor" /> : null}
        {type === "TASK" ? <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /> : null}
        {type === "SUB_TASK" ? <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" /> : null}
      </svg>
      <span className="sr-only">{ISSUE_TYPE_LABELS[type]}</span>
    </span>
  );
}

function statusClass(status: IssueStatus): string {
  if (status === "DONE") return "text-success";
  if (status === "IN_PROGRESS") return "text-accent-strong";
  if (status === "IN_REVIEW") return "text-warning";
  return "text-muted";
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <Select
        id={id}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-[8.5rem] text-[13px]"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
