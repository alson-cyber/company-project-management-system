import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { AutoSubmitForm } from "@/components/my-work/filter-panel";
import { QuickStatus } from "@/components/my-work/quick-status";
import { cn } from "@/components/ui/cn";
import { FilterSelect, filterLabelClass } from "@/components/ui/filter-fields";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/components/ui/format";
import { ISSUE_TYPE_STYLES, IssuePriorityBadge, IssueStatusDot, IssueTypeIcon } from "@/components/ui/issue-badges";
import { isOverdue, parseCalendarDate } from "@/lib/calendar";
import {
  countMyWorkViews,
  filterMyWork,
  isDueState,
  isMyWorkSort,
  isMyWorkView,
  type DueState,
  type MyWorkIssue,
  type MyWorkQuery,
  type MyWorkSort,
  type MyWorkView,
} from "@/modules/attention/attention.rules";
import { loadMyWork } from "@/modules/attention/my-work.queries";
import { describeToday, todaySummary } from "@/modules/attention/today";
import {
  HIGH_PRIORITIES,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
} from "@/modules/issues/issue.constants";
import { listVisibleProjects } from "@/modules/projects/project.queries";
import { requireAuthContext } from "@/server/access/session";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "My Work" };

/** Titles for the focused views reached from group headings and dashboard tiles. */
const VIEW_TITLES: Record<MyWorkView, string> = {
  assigned: "All open work",
  progress: "In Progress",
  review: "In Review",
  soon: "Due soon",
  overdue: "Overdue",
  updated: "Recently updated",
  completed: "Completed",
};

const EMPTY: Record<MyWorkView, string> = {
  assigned: "Nothing is assigned to you.",
  progress: "You have no work in progress.",
  review: "You have nothing in review.",
  soon: "Nothing assigned to you is due soon.",
  overdue: "Nothing assigned to you is overdue.",
  updated: "None of your open work was updated in the last 14 days.",
  completed: "You have not completed work in the last 14 days.",
};

type FilterKey = "project" | "status" | "type" | "priority" | "due" | "sort";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function queryFrom(params: Record<string, string | string[] | undefined>): MyWorkQuery {
  const view = first(params.view);
  const sort = first(params.sort);
  const due = first(params.due);
  return {
    view: isMyWorkView(view) ? view : "assigned",
    projectId: first(params.project),
    status: first(params.status),
    type: first(params.type),
    priority: first(params.priority),
    due: isDueState(due) ? due : "",
    sort: isMyWorkSort(sort) ? sort : "due",
  };
}

function paramsOf(query: MyWorkQuery): Record<FilterKey, string> {
  return {
    project: query.projectId,
    status: query.status,
    type: query.type,
    priority: query.priority,
    due: query.due,
    sort: query.sort === "due" ? "" : query.sort,
  };
}

function hrefFor(query: MyWorkQuery, view: MyWorkView, without?: FilterKey): string {
  const params = new URLSearchParams();
  if (view !== "assigned") params.set("view", view);
  for (const [key, value] of Object.entries(paramsOf(query))) {
    if (value && key !== without) params.set(key, value);
  }
  const text = params.toString();
  return text ? `/my-work?${text}` : "/my-work";
}

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAuthContext();
  const query = queryFrom(await searchParams);
  const timeZone = getEnv().COMPANY_TIMEZONE;
  const [issues, projects] = await Promise.all([loadMyWork(ctx), listVisibleProjects(ctx)]);
  const shared = {
    projectId: query.projectId,
    status: query.status,
    type: query.type,
    priority: query.priority,
    due: query.due as DueState,
  };
  const counts = countMyWorkViews(issues, ctx.userId, shared, timeZone);
  const summary = describeToday(todaySummary(issues, ctx.userId, timeZone));
  const list = (view: MyWorkView) => filterMyWork(issues, ctx.userId, { ...query, view }, timeZone);
  const chips = activeFilters(query, projects);
  const showingCompleted = query.view === "completed";

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em]">My Work</h1>
          <p className="mt-1.5 text-[15px] text-muted">{summary}</p>
        </div>
        <nav aria-label="Open or completed work" className="inline-flex shrink-0 rounded-lg bg-surface-3 p-1">
          <SegmentLink href={hrefFor(query, "assigned")} current={!showingCompleted}>
            Open <span className="tabular-nums text-muted">{counts.assigned}</span>
          </SegmentLink>
          <SegmentLink href={hrefFor(query, "completed")} current={showingCompleted}>
            Completed <span className="tabular-nums text-muted">{counts.completed}</span>
          </SegmentLink>
        </nav>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <details className="group relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[13px] font-medium text-ink shadow-card transition-colors hover:border-line-strong [&::-webkit-details-marker]:hidden">
            <svg viewBox="0 0 16 16" className="size-3.5 text-muted" aria-hidden="true">
              <path
                d="M2.5 4h11M4.5 8h7M6.5 12h3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            Filter
            {chips.length ? (
              <span className="rounded-full bg-accent px-1.5 text-[11px] text-on-accent">{chips.length}</span>
            ) : null}
          </summary>
          <div className="absolute left-0 z-20 mt-2 w-[min(92vw,44rem)] rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-pop">
            <AutoSubmitForm label="My Work filters">
              {query.view !== "assigned" ? <input type="hidden" name="view" value={query.view} /> : null}
              <Filter label="Project" name="project" value={query.projectId}>
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Filter>
              <Filter label="Status" name="status" value={query.status}>
                <option value="">Any status</option>
                {ISSUE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ISSUE_STATUS_LABELS[status]}
                  </option>
                ))}
              </Filter>
              <Filter label="Type" name="type" value={query.type}>
                <option value="">Any type</option>
                {ISSUE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ISSUE_TYPE_LABELS[type]}
                  </option>
                ))}
              </Filter>
              <Filter label="Priority" name="priority" value={query.priority}>
                <option value="">Any priority</option>
                {ISSUE_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {ISSUE_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </Filter>
              <Filter label="Due" name="due" value={query.due}>
                <option value="">Any due date</option>
                <option value="overdue">Overdue</option>
                <option value="soon">Due soon</option>
                <option value="later">Later</option>
                <option value="none">No due date</option>
              </Filter>
              <Filter label="Sort" name="sort" value={query.sort as MyWorkSort}>
                <option value="due">Due date</option>
                <option value="updated">Recently updated</option>
                <option value="priority">Priority</option>
              </Filter>
            </AutoSubmitForm>
          </div>
        </details>
        {chips.map((chip) => (
          <Link
            key={chip.key}
            href={hrefFor(query, query.view, chip.key)}
            aria-label={`Remove filter ${chip.label}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface-2 pl-3 pr-2 text-[13px] text-ink transition-colors hover:border-line-strong"
          >
            {chip.label}
            <span aria-hidden="true" className="text-muted">
              ×
            </span>
          </Link>
        ))}
        {chips.length > 1 ? (
          <Link href={hrefFor({ ...query, ...CLEARED }, query.view)} className="text-[13px] text-muted hover:text-ink">
            Clear all
          </Link>
        ) : null}
      </div>

      {query.view === "assigned" ? (
        <GroupedWork
          query={query}
          overdue={list("overdue")}
          soon={list("soon")}
          progress={list("progress")}
          review={list("review")}
          open={list("assigned")}
          completed={list("completed")}
          timeZone={timeZone}
        />
      ) : (
        <FocusedWork query={query} rows={list(query.view)} timeZone={timeZone} />
      )}
    </>
  );
}

const CLEARED = { projectId: "", status: "", type: "", priority: "", due: "" as const, sort: "due" as const };

function activeFilters(
  query: MyWorkQuery,
  projects: Array<{ id: string; name: string }>,
): Array<{ key: FilterKey; label: string }> {
  const chips: Array<{ key: FilterKey; label: string }> = [];
  if (query.projectId)
    chips.push({ key: "project", label: projects.find((p) => p.id === query.projectId)?.name ?? "Project" });
  if (query.status)
    chips.push({ key: "status", label: ISSUE_STATUS_LABELS[query.status as keyof typeof ISSUE_STATUS_LABELS] ?? query.status });
  if (query.type)
    chips.push({ key: "type", label: ISSUE_TYPE_LABELS[query.type as keyof typeof ISSUE_TYPE_LABELS] ?? query.type });
  if (query.priority)
    chips.push({
      key: "priority",
      label: `${ISSUE_PRIORITY_LABELS[query.priority as keyof typeof ISSUE_PRIORITY_LABELS] ?? query.priority} priority`,
    });
  if (query.due) {
    const due = { overdue: "Overdue", soon: "Due soon", later: "Due later", none: "No due date" }[query.due];
    chips.push({ key: "due", label: due });
  }
  if (query.sort !== "due")
    chips.push({ key: "sort", label: query.sort === "priority" ? "Sorted by priority" : "Sorted by update" });
  return chips;
}

/** The default view: one list, grouped by what to do next. Each issue appears once. */
function GroupedWork({
  query,
  overdue,
  soon,
  progress,
  review,
  open,
  completed,
  timeZone,
}: {
  query: MyWorkQuery;
  overdue: MyWorkIssue[];
  soon: MyWorkIssue[];
  progress: MyWorkIssue[];
  review: MyWorkIssue[];
  open: MyWorkIssue[];
  completed: MyWorkIssue[];
  timeZone: string;
}) {
  const seen = new Set<string>();
  const take = (rows: MyWorkIssue[]) =>
    rows.filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
  const attention = take([...overdue, ...soon]);
  const inProgress = take(progress);
  const inReview = take(review);
  const upNext = take(open.filter((row) => row.status === "TO_DO"));
  const other = take(open);

  if (open.length === 0) {
    return (
      <div className="grid gap-4">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface shadow-card">
          <EmptyState title="Nothing is assigned to you." illustration="clear">
            When work is assigned to you, it appears here grouped by what to do next.
          </EmptyState>
        </div>
        <CompletedGroup query={query} rows={completed} timeZone={timeZone} />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Group
        tone="danger"
        title="Needs attention"
        hint="Overdue or due soon"
        href={hrefFor(query, overdue.length ? "overdue" : "soon")}
        rows={attention}
        timeZone={timeZone}
        showStatus
      />
      <Group tone="info" title="In Progress" href={hrefFor(query, "progress")} rows={inProgress} timeZone={timeZone} />
      <Group tone="purple" title="In Review" href={hrefFor(query, "review")} rows={inReview} timeZone={timeZone} />
      <Group tone="neutral" title="Up next" hint="To Do" rows={upNext} timeZone={timeZone} />
      <Group tone="neutral" title="Other open work" rows={other} timeZone={timeZone} showStatus />
      <CompletedGroup query={query} rows={completed} timeZone={timeZone} />
    </div>
  );
}

const GROUP_DOTS = {
  danger: "bg-danger",
  info: "bg-info",
  purple: "bg-purple",
  neutral: "bg-muted-2",
} as const;

function Group({
  tone,
  title,
  hint,
  href,
  rows,
  timeZone,
  showStatus = false,
}: {
  tone: keyof typeof GROUP_DOTS;
  title: string;
  hint?: string;
  href?: string;
  rows: MyWorkIssue[];
  timeZone: string;
  showStatus?: boolean;
}) {
  if (rows.length === 0) return null;
  const heading = (
    <>
      <span className={cn("size-2 rounded-full", GROUP_DOTS[tone])} aria-hidden="true" />
      {title}
      <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium tabular-nums text-muted">
        {rows.length}
      </span>
    </>
  );
  return (
    <section aria-label={title}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {href ? (
          <Link href={href} className="inline-flex items-center gap-2 hover:underline">
            {heading}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2">{heading}</span>
        )}
        {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
      </h2>
      <WorkList rows={rows} timeZone={timeZone} showStatus={showStatus} />
    </section>
  );
}

function CompletedGroup({ query, rows, timeZone }: { query: MyWorkQuery; rows: MyWorkIssue[]; timeZone: string }) {
  if (rows.length === 0) return null;
  return (
    <details className="group">
      <summary className="mb-2 flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 16 16" className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true">
          <path
            d="M6 3.5 11 8 6 12.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Recently completed
        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium tabular-nums">{rows.length}</span>
        <Link
          href={hrefFor(query, "completed")}
          className="ml-1 text-xs font-normal text-muted underline-offset-2 hover:underline"
        >
          See all
        </Link>
      </summary>
      <WorkList rows={rows} timeZone={timeZone} completed />
    </details>
  );
}

/** A single view reached from a group heading or a dashboard tile. */
function FocusedWork({ query, rows, timeZone }: { query: MyWorkQuery; rows: MyWorkIssue[]; timeZone: string }) {
  const completed = query.view === "completed";
  return (
    <section aria-label={VIEW_TITLES[query.view]}>
      <div className="mb-3 flex items-center gap-3">
        {completed ? null : (
          <Link href={hrefFor(query, "assigned")} className="text-[13px] text-muted hover:text-ink">
            ← All open work
          </Link>
        )}
        <h2 className="text-sm font-semibold">
          {VIEW_TITLES[query.view]}
          <span className="ml-2 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium tabular-nums text-muted">
            {rows.length}
          </span>
        </h2>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface shadow-card">
          <EmptyState
            title={EMPTY[query.view]}
            illustration={query.view === "overdue" || query.view === "review" || query.view === "soon" ? "clear" : "box"}
          />
        </div>
      ) : (
        <WorkList rows={rows} timeZone={timeZone} completed={completed} showStatus={!completed} />
      )}
    </section>
  );
}

function WorkList({
  rows,
  timeZone,
  completed = false,
  showStatus = false,
}: {
  rows: MyWorkIssue[];
  timeZone: string;
  completed?: boolean;
  showStatus?: boolean;
}) {
  return (
    <ul className="grid gap-2">
      {rows.map((issue) => {
        const due = issue.dueDate ? parseCalendarDate(issue.dueDate) : null;
        const overdue = isOverdue(due, issue.status, timeZone);
        return (
          <li
            key={issue.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-l-[3px] border-line bg-surface px-4 py-3 shadow-card transition-shadow duration-150 hover:shadow-lift",
              ISSUE_TYPE_STYLES[issue.type].stripe,
            )}
          >
            <IssueTypeIcon type={issue.type} />
            <div className="min-w-0 flex-1">
              <Link
                href={`/issues/${issue.key}`}
                className="block truncate text-[15px] font-medium leading-snug hover:underline"
              >
                <span className="sr-only">{issue.key} </span>
                {issue.title}
              </Link>
              <p className="mt-0.5 truncate text-xs text-muted">
                <span className="font-mono">{issue.key}</span> · {issue.projectName}
                {issue.context ? ` · In ${issue.context}` : ""}
              </p>
            </div>
            {showStatus && !completed ? (
              <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted md:inline-flex">
                <IssueStatusDot status={issue.status} className="size-1.5" />
                {ISSUE_STATUS_LABELS[issue.status]}
              </span>
            ) : null}
            {!completed && HIGH_PRIORITIES.has(issue.priority) ? (
              <span className="hidden sm:inline-flex">
                <IssuePriorityBadge priority={issue.priority} />
              </span>
            ) : null}
            {completed ? (
              <span className="shrink-0 text-xs text-muted">
                {issue.completedAt ? `Completed ${formatDate(issue.completedAt)}` : "Completed"}
              </span>
            ) : issue.dueDate ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums",
                  overdue ? "bg-danger-soft font-medium text-danger" : "text-muted",
                )}
              >
                {overdue ? "Overdue · " : "Due "}
                <time dateTime={issue.dueDate}>{formatDate(issue.dueDate)}</time>
              </span>
            ) : null}
            {completed ? null : (
              <QuickStatus
                issueId={issue.id}
                projectKey={issue.projectKey}
                issueNumber={issue.number}
                issueKey={issue.key}
                status={issue.status}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SegmentLink({ href, current, children }: { href: string; current: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors",
        current ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

function Filter({ label, name, value, children }: { label: string; name: string; value: string; children: ReactNode }) {
  return (
    <label className={`${filterLabelClass} min-w-44`}>
      {label}
      <FilterSelect name={name} defaultValue={value} aria-label={label}>
        {children}
      </FilterSelect>
    </label>
  );
}
