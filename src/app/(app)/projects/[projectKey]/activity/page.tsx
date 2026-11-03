import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectIssueLink } from "@/components/projects/project-issue-link";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { ReportFilterForm } from "@/components/reporting/report-filter-form";
import { formatDate } from "@/components/ui/format";
import { addCalendarDays, calendarDayInTimeZone } from "@/lib/calendar";
import { activityActionLabel, activityDetail, activityKind, describeActivity } from "@/modules/activity/activity.format";
import {
  isActivityAction,
  listProjectActivityPage,
  type ProjectActivityFilter,
  type ProjectActivityRow,
} from "@/modules/activity/activity.queries";
import { ACTIVITY_ACTIONS } from "@/modules/activity/activity.types";
import { parseIssueKey } from "@/modules/issues/issue.keys";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { companyToday, companyTimeZone } from "@/modules/reporting/trend.queries";
import { requireAuthContext } from "@/server/access/session";
import { visibleProject } from "../guard";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string }> }): Promise<Metadata> {
  const { project } = await visibleProject((await params).projectKey);
  return { title: `${project.key} · Activity` };
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Builds this page's URL, dropping empty params. Filters survive paging and chip removal this way. */
function activityHref(projectKey: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return `/projects/${projectKey}/activity${query ? `?${query}` : ""}`;
}

interface DayGroup {
  key: string;
  label: string;
  rows: ProjectActivityRow[];
}

/** Groups newest-first rows by company calendar day. Labels read "Today" and "Yesterday" where they apply. */
function groupByDay(rows: ProjectActivityRow[], timeZone: string, today: string): DayGroup[] {
  const yesterday = addCalendarDays(today, -1);
  const groups: DayGroup[] = [];
  for (const row of rows) {
    const key = calendarDayInTimeZone(row.occurredAt, timeZone);
    const last = groups.at(-1);
    if (last && last.key === key) {
      last.rows.push(row);
      continue;
    }
    const label = key === today ? "Today" : key === yesterday ? "Yesterday" : formatDate(`${key}T00:00:00Z`);
    groups.push({ key, label, rows: [row] });
  }
  return groups;
}

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectKey } = await params;
  const query = await searchParams;
  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();

  const person = first(query.person);
  const action = first(query.action);
  const issue = first(query.issue).trim();
  const from = isDay(first(query.from)) ? first(query.from) : "";
  const to = isDay(first(query.to)) ? first(query.to) : "";
  const validAction = isActivityAction(action) ? action : undefined;
  const parsedKey = parseIssueKey(issue);
  const issueNumber = parsedKey?.projectKey === project.key ? parsedKey.number : /^\d+$/.test(issue) ? Number(issue) : undefined;
  const filter: ProjectActivityFilter = {
    ...(person ? { actorId: person } : {}),
    ...(validAction ? { action: validAction } : {}),
    ...(issueNumber ? { issueNumber } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
  const page = await listProjectActivityPage(ctx, project.id, filter, { cursor: first(query.cursor) || undefined });

  const timeZone = companyTimeZone();
  const today = companyToday();
  const groups = groupByDay(page.rows, timeZone, today);
  const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });

  // Every active filter, as the URL that removes just that one. Paging is dropped on purpose: a cursor belongs to one filter set.
  const current: Record<string, string | undefined> = {
    person: person || undefined,
    action: validAction,
    issue: issue || undefined,
    from: from || undefined,
    to: to || undefined,
  };
  const chips: { label: string; href: string }[] = [];
  if (person) {
    const name = project.members.find((member) => member.userId === person)?.name ?? "Selected person";
    chips.push({ label: `Person: ${name}`, href: activityHref(project.key, { ...current, person: undefined }) });
  }
  if (validAction) {
    chips.push({ label: `Action: ${activityActionLabel(validAction)}`, href: activityHref(project.key, { ...current, action: undefined }) });
  }
  if (issue) {
    chips.push({ label: `Issue: ${issue}`, href: activityHref(project.key, { ...current, issue: undefined }) });
  }
  if (from) {
    chips.push({ label: `From ${formatDate(`${from}T00:00:00Z`)}`, href: activityHref(project.key, { ...current, from: undefined }) });
  }
  if (to) {
    chips.push({ label: `To ${formatDate(`${to}T00:00:00Z`)}`, href: activityHref(project.key, { ...current, to: undefined }) });
  }
  const filtering = chips.length > 0;
  const count = page.rows.length;

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="activity" />
      <p className="mb-3 text-xs text-muted">Recorded changes for this project. This is history, not an inbox.</p>
      <ReportFilterForm label="Activity filters" className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:items-end">
        <label className="grid gap-1 text-xs font-medium text-muted">
          Person
          <select name="person" defaultValue={person} aria-label="Person" className="h-10 w-full min-w-0 border border-line bg-surface px-2 text-sm">
            <option value="">Anyone</option>
            {project.members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Action
          <select name="action" defaultValue={action} aria-label="Action" className="h-10 w-full min-w-0 border border-line bg-surface px-2 text-sm">
            <option value="">Any action</option>
            {ACTIVITY_ACTIONS.map((item) => (
              <option key={item} value={item}>
                {activityActionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Issue
          <input
            name="issue"
            defaultValue={issue}
            placeholder="Key"
            aria-label="Issue"
            className="h-10 w-full min-w-0 border border-line bg-surface px-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          From
          <input name="from" type="date" defaultValue={from} aria-label="From" className="h-10 w-full min-w-0 border border-line bg-surface px-2 text-sm" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          To
          <input name="to" type="date" defaultValue={to} aria-label="To" className="h-10 w-full min-w-0 border border-line bg-surface px-2 text-sm" />
        </label>
        <button type="submit" className="h-10 w-full bg-accent px-3 text-[13px] font-semibold text-on-accent hover:opacity-90">
          Apply
        </button>
      </ReportFilterForm>

      {filtering ? (
        <ul aria-label="Active filters" className="mb-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <li key={chip.label}>
              <Link
                href={chip.href}
                title="Remove this filter"
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs hover:border-line-strong"
              >
                {chip.label}
                <span aria-hidden="true" className="text-muted">
                  ×
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/projects/${project.key}/activity`} className="px-1 text-xs font-medium text-accent-strong hover:underline">
              Clear all
            </Link>
          </li>
        </ul>
      ) : null}

      <p className="mb-2 text-xs text-muted">
        {count === 0
          ? filtering
            ? "No activity matches these filters."
            : "No activity yet."
          : `Showing ${count} ${count === 1 ? "change" : "changes"}, newest first${page.nextCursor ? "" : filtering ? " for these filters" : ""}.`}
      </p>

      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="sticky top-0 z-10 border-b border-line bg-surface/95 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted backdrop-blur">
            {group.label}
          </h2>
          <ol className="divide-y divide-line/70">
            {group.rows.map((event) => (
              <li key={event.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
                <span className="shrink-0 rounded-sm border border-line px-1.5 py-px text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {activityKind(event)}
                </span>
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-semibold">{event.actorName ?? "System"}</span>{" "}
                    <span className="text-muted">{describeActivity(event)}</span>
                  </p>
                  {activityDetail(event) ? <p className="text-[13px] text-muted">{activityDetail(event)}</p> : null}
                </div>
                <div className="flex items-baseline gap-3 text-xs">
                  {event.issue ? (
                    <ProjectIssueLink
                      projectKey={project.key}
                      number={event.issue.number}
                      issueKey={event.issue.key}
                      title={event.issue.title}
                    />
                  ) : (
                    <span className="text-muted">Project</span>
                  )}
                  <time className="tabular-nums text-muted-2" dateTime={event.occurredAt.toISOString()}>
                    {clock.format(event.occurredAt)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {page.nextCursor ? (
        <Link
          href={activityHref(project.key, { ...current, cursor: page.nextCursor })}
          className="mt-4 inline-block text-sm font-medium text-accent-strong hover:underline"
        >
          Older activity
        </Link>
      ) : null}
    </>
  );
}
