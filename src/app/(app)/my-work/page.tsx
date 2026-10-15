import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { IssuePriorityBadge, IssueStatusBadge, IssueTypeBadge } from "@/components/ui/issue-badges";
import { formatDate } from "@/components/ui/format";
import { PageHeader } from "@/components/ui/page-header";
import { isOverdue, parseCalendarDate } from "@/lib/calendar";
import {
  countMyWorkViews,
  filterMyWork,
  isDueState,
  isMyWorkSort,
  isMyWorkView,
  MY_WORK_VIEWS,
  type DueState,
  type MyWorkQuery,
  type MyWorkSort,
  type MyWorkView,
} from "@/modules/attention/attention.rules";
import { loadMyWork } from "@/modules/attention/my-work.queries";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, ISSUE_PRIORITY_LABELS, ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS } from "@/modules/issues/issue.constants";
import { listVisibleProjects } from "@/modules/projects/project.queries";
import { requireAuthContext } from "@/server/access/session";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "My Work" };

const VIEW_LABELS: Record<MyWorkView, string> = {
  assigned: "Assigned",
  progress: "In Progress",
  review: "In Review",
  soon: "Due soon",
  overdue: "Overdue",
  updated: "Updated",
  completed: "Completed",
};

const EMPTY: Record<MyWorkView, string> = {
  assigned: "Nothing is assigned to you.",
  progress: "You have no work in progress.",
  review: "You have nothing in review.",
  soon: "Nothing assigned to you is due in the next 7 days.",
  overdue: "Nothing assigned to you is overdue.",
  updated: "None of your open work was updated in the last 14 days.",
  completed: "You have not completed work in the last 14 days.",
};

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

function viewHref(query: MyWorkQuery, view: MyWorkView): string {
  const params = new URLSearchParams();
  if (view !== "assigned") params.set("view", view);
  if (query.projectId) params.set("project", query.projectId);
  if (query.status) params.set("status", query.status);
  if (query.type) params.set("type", query.type);
  if (query.priority) params.set("priority", query.priority);
  if (query.due) params.set("due", query.due);
  if (query.sort !== "due") params.set("sort", query.sort);
  const text = params.toString();
  return text ? `/my-work?${text}` : "/my-work";
}

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAuthContext();
  const params = await searchParams;
  const query = queryFrom(params);
  const timeZone = getEnv().COMPANY_TIMEZONE;
  const [issues, projects] = await Promise.all([loadMyWork(ctx), listVisibleProjects(ctx)]);
  const shared = { projectId: query.projectId, status: query.status, type: query.type, priority: query.priority, due: query.due as DueState };
  const counts = countMyWorkViews(issues, ctx.userId, shared, timeZone);
  const rows = filterMyWork(issues, ctx.userId, query, timeZone);
  const filtering = Boolean(query.projectId || query.status || query.type || query.priority || query.due || query.sort !== "due");

  return (
    <>
      <PageHeader
        title="My Work"
        description="Open work assigned to you, and work you completed in the last 14 days. Completion stays with the person who finished it."
      />
      <nav aria-label="My Work views" className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {MY_WORK_VIEWS.map((view) => {
          const current = view === query.view;
          return (
            <Link
              key={view}
              href={viewHref(query, view)}
              aria-current={current ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-2 text-[13px] ${current ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {VIEW_LABELS[view]}
              <span className="ml-1.5 tabular-nums text-muted">{counts[view]}</span>
            </Link>
          );
        })}
      </nav>
      <form method="get" aria-label="My Work filters" className="mb-4 flex flex-wrap items-end gap-2">
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
        <button type="submit" className="h-10 px-3 text-[13px] font-semibold text-accent-strong hover:underline">
          Apply
        </button>
        {filtering ? (
          <a href={query.view === "assigned" ? "/my-work" : `/my-work?view=${query.view}`} className="h-10 px-2 text-[13px] leading-10 text-muted">
            Reset
          </a>
        ) : null}
      </form>
      {rows.length === 0 ? <p className="text-sm text-muted">{EMPTY[query.view]}</p> : null}
      <ul className="divide-y divide-line/70">
        {rows.map((issue) => {
          const due = issue.dueDate ? parseCalendarDate(issue.dueDate) : null;
          const overdue = isOverdue(due, issue.status, timeZone);
          return (
            <li key={issue.id} className="py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link href={`/issues/${issue.key}`} className="text-sm font-semibold hover:underline">
                  <span className="mr-2 font-medium text-muted">{issue.key}</span>
                  {issue.title}
                </Link>
                <span className="text-xs text-muted">{issue.projectName}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                <IssueTypeBadge type={issue.type} />
                <IssueStatusBadge status={issue.status} />
                <IssuePriorityBadge priority={issue.priority} />
                {issue.dueDate ? (
                  <span className={overdue ? "font-semibold text-danger" : undefined}>
                    {overdue ? "Overdue " : "Due "}
                    <time dateTime={issue.dueDate}>{formatDate(issue.dueDate)}</time>
                  </span>
                ) : (
                  <span>No due date</span>
                )}
                {issue.context ? <span>In {issue.context}</span> : null}
                {query.view === "completed" && issue.completedAt ? (
                  <span>Completed {formatDate(issue.completedAt)}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Filter({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted">
      {label}
      <select name={name} defaultValue={value} aria-label={label} className="h-10 min-w-36 border border-line bg-surface px-2 text-sm text-ink">
        {children}
      </select>
    </label>
  );
}
