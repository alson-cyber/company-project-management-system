"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ISSUE_TYPE_STYLES, IssueTypeIcon, IssueTypeLegend } from "@/components/ui/issue-badges";
import { cn } from "@/components/ui/cn";
import { ProgressRing } from "@/components/ui/progress-ring";
import { formatDate } from "@/components/ui/format";
import {
  markerLeft,
  timelineMark,
  visibleTimelineRows,
  type TimelineRow,
  type TimelineWindow,
} from "@/modules/projects/workspace.model";

export function ProjectTimeline({
  projectKey,
  rows,
  window,
  today,
  targetDate,
}: {
  projectKey: string;
  rows: TimelineRow[];
  window: TimelineWindow;
  today: string;
  targetDate: string | null;
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const visible = useMemo(() => visibleTimelineRows(rows, collapsed), [rows, collapsed]);
  const todayLeft = markerLeft(today, window);
  const targetLeft = markerLeft(targetDate, window);
  const dayWidth = 18;
  const chartWidth = Math.max(window.totalDays * dayWidth, 640);

  if (rows.length === 0) {
    return <p className="text-sm text-muted">No issues to place on the timeline.</p>;
  }

  return (
    <div className="grid min-w-0 gap-3">
      <IssueTypeLegend />
      <ul className="min-w-0 divide-y divide-line/70 md:hidden">
        {visible.map((row) => (
          <li key={row.issue.id} className="py-2.5" style={{ paddingLeft: row.depth * 12 }}>
            <RowLabel projectKey={projectKey} row={row} collapsed={collapsed.has(row.issue.id)} onToggle={() => toggle(row.issue.id, collapsed, setCollapsed)} />
            <p className="mt-1 text-xs text-muted">{dateSummary(row)}</p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-auto rounded-[var(--radius-card)] border border-line bg-surface md:block">
        <div className="flex min-w-max">
          <div className="sticky left-0 z-20 w-72 shrink-0 border-r border-line bg-surface">
            <div className="flex h-10 items-end border-b border-line px-3 pb-2 text-xs font-semibold text-muted">Work</div>
            {visible.map((row) => (
              <div key={row.issue.id} className="flex h-11 items-center border-b border-line/70 px-2">
                <div className="min-w-0 flex-1" style={{ paddingLeft: row.depth * 12 }}>
                  <RowLabel
                    projectKey={projectKey}
                    row={row}
                    collapsed={collapsed.has(row.issue.id)}
                    onToggle={() => toggle(row.issue.id, collapsed, setCollapsed)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="relative" style={{ width: chartWidth }}>
            <div className="flex h-10 border-b border-line">
              {window.months.map((month) => (
                <div
                  key={month.start}
                  className="flex items-end border-r border-line/70 px-2 pb-2 text-xs font-semibold text-muted"
                  style={{ width: (month.days / window.totalDays) * chartWidth }}
                >
                  {month.label}
                </div>
              ))}
            </div>
            {todayLeft !== null ? <Marker left={(todayLeft / 100) * chartWidth} label="Today" /> : null}
            {targetLeft !== null ? <Marker left={(targetLeft / 100) * chartWidth} label="Target" /> : null}
            {visible.map((row) => {
              const mark = timelineMark(row.issue, window);
              return (
                <div key={row.issue.id} className="relative h-11 border-b border-line/70">
                  {mark?.kind === "bar" ? (
                    <div
                      className={cn(
                        "absolute top-3.5 h-4 rounded-[4px]",
                        ISSUE_TYPE_STYLES[row.issue.type].bar,
                        row.issue.overdue ? "ring-2 ring-danger ring-offset-1" : null,
                      )}
                      style={{ left: `${mark.left}%`, width: `${mark.width}%` }}
                      title={`${row.issue.plannedStartDate} to ${row.issue.dueDate}`}
                    />
                  ) : null}
                  {mark?.kind === "point" ? (
                    <div className="absolute top-3 text-[11px] font-semibold text-muted" style={{ left: `${mark.left}%` }}>
                      <span aria-hidden="true">◆ </span>
                      {mark.label} {formatDate(mark.label === "Due" ? row.issue.dueDate : row.issue.plannedStartDate)}
                    </div>
                  ) : null}
                  {mark === null ? <span className="absolute top-3 left-2 text-[11px] text-muted-2">No dates</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function toggle(id: string, collapsed: ReadonlySet<string>, setCollapsed: (next: ReadonlySet<string>) => void) {
  const next = new Set(collapsed);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setCollapsed(next);
}

function dateSummary(row: TimelineRow): string {
  const start = row.issue.plannedStartDate ? formatDate(row.issue.plannedStartDate) : null;
  const due = row.issue.dueDate ? formatDate(row.issue.dueDate) : null;
  if (start && due) return `${start} – ${due}${row.issue.overdue ? " · Overdue" : ""}`;
  if (due) return `Due ${due}${row.issue.overdue ? " · Overdue" : ""}`;
  if (start) return `Starts ${start}`;
  return "No dates";
}

function RowLabel({
  projectKey,
  row,
  collapsed,
  onToggle,
}: {
  projectKey: string;
  row: TimelineRow;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {row.hasChildren ? (
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${row.issue.key}` : `Collapse ${row.issue.key}`}
          onClick={onToggle}
          className="size-6 shrink-0 text-xs text-muted hover:text-ink"
        >
          {collapsed ? "▸" : "▾"}
        </button>
      ) : (
        <span className="size-6 shrink-0" aria-hidden="true" />
      )}
      <IssueTypeIcon type={row.issue.type} size="sm" />
      <Link
        href={`/projects/${projectKey}/issues/${row.issue.number}`}
        className={cn("min-w-0 flex-1 truncate text-[13px] hover:underline", row.issue.type === "EPIC" ? "font-semibold" : "font-medium")}
      >
        <span className="mr-1 font-mono text-xs text-muted">{row.issue.key}</span>
        {row.issue.title}
      </Link>
      {row.issue.overdue ? <span className="shrink-0 text-[11px] font-semibold text-danger">Overdue</span> : null}
      {row.issue.progress.total > 0 ? (
        <ProgressRing
          percent={row.issue.progress.percent}
          size={14}
          label={`${row.issue.progress.done} of ${row.issue.progress.total} done`}
        />
      ) : null}
    </div>
  );
}

function Marker({ left, label }: { left: number; label: string }) {
  return (
    <div className="pointer-events-none absolute top-0 bottom-0 z-10 border-l border-dashed border-ink/40" style={{ left }}>
      <span className="absolute top-1 left-1 bg-surface px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}
