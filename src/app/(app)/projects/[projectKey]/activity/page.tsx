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

/** One colour per kind of change, so rows read apart at a glance. Unknown kinds stay neutral. */
function kindTone(kind: string): string {
  switch (kind) {
    case "ISSUE":
      return "text-info";
    case "STATUS":
      return "text-success";
    case "COMMENT":
      return "text-purple";
    case "FILE":
      return "text-teal";
    case "PROJECT":
      return "text-warning";
    default:
      return "text-muted";
  }
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

/** Same rounded box for every field. Fill, border and text are set explicitly so the browser's defaults never show through. */
const fieldClass =
  "h-10 w-full min-w-0 appearance-none rounded-xl border border-line-strong bg-surface-2 px-3 text-sm text-ink placeholder:text-muted-2 outline-none transition-colors hover:border-muted-2 focus:border-accent focus:ring-3 focus:ring-accent/15 selection:bg-accent-soft";

const labelClass = "grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-2";

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
      <p className="mb-5 text-xs text-muted">Recorded changes for this project. This is history, not an inbox.</p>

      <ReportFilterForm label="Activity filters" className="grid grid-cols-2 items-end gap-x-3 gap-y-4 border-b border-line pb-5 sm:grid-cols-3 lg:grid-cols-6">
        <label className={labelClass}>
          Person
          <span className="relative block">
            <select name="person" defaultValue={person} aria-label="Person" className={fieldClass}>
              <option value="">Anyone</option>
              {project.members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name}
                </option>
              ))}
            </select>
            <Chevron />
          </span>
        </label>
        <label className={labelClass}>
          Action
          <span className="relative block">
            <select name="action" defaultValue={action} aria-label="Action" className={fieldClass}>
              <option value="">Any action</option>
              {ACTIVITY_ACTIONS.map((item) => (
                <option key={item} value={item}>
                  {activityActionLabel(item)}
                </option>
              ))}
            </select>
            <Chevron />
          </span>
        </label>
        <label className={labelClass}>
          Issue
          <input name="issue" defaultValue={issue} placeholder="e.g. AQUA-8" aria-label="Issue" className={fieldClass} />
        </label>
        <label className={labelClass}>
          From
          <input name="from" type="date" defaultValue={from} aria-label="From" className={fieldClass} />
        </label>
        <label className={labelClass}>
          To
          <input name="to" type="date" defaultValue={to} aria-label="To" className={fieldClass} />
        </label>
        <button
          type="submit"
          className="h-10 w-full rounded-xl bg-accent px-4 text-[13px] font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          Apply
        </button>
      </ReportFilterForm>

      {filtering ? (
        <ul aria-label="Active filters" className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <li key={chip.label}>
              <Link
                href={chip.href}
                title="Remove this filter"
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2.5 py-1 text-xs text-ink hover:bg-line"
              >
                {chip.label}
                <span aria-hidden="true" className="text-muted">
                  ×
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/projects/${project.key}/activity`} className="px-1 text-xs text-muted underline-offset-4 hover:text-ink hover:underline">
              Clear all
            </Link>
          </li>
        </ul>
      ) : null}

      <p className="mt-5 text-xs text-muted-2">
        {count === 0
          ? filtering
            ? "No activity matches these filters."
            : "No activity yet."
          : `${count} ${count === 1 ? "change" : "changes"}, newest first${page.nextCursor ? "" : filtering ? " for these filters" : ""}.`}
      </p>

      {groups.map((group) => (
        <section key={group.key} aria-label={group.label} className="mt-6">
          <h2 className="sticky top-0 z-10 flex items-center gap-3 bg-canvas/95 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2 backdrop-blur">
            {group.label}
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </h2>
          <ol>
            {group.rows.map((event) => {
              const kind = activityKind(event);
              const detail = activityDetail(event);
              return (
                <li
                  key={event.id}
                  className="grid gap-x-5 gap-y-1 border-b border-line/60 py-3.5 text-sm last:border-0 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto] sm:items-baseline"
                >
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${kindTone(kind)}`}>
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                    {kind}
                  </span>
                  <div className="min-w-0">
                    <p className="leading-relaxed">
                      <span className="font-semibold text-ink">{event.actorName ?? "System"}</span>{" "}
                      <span className="text-muted">{describeActivity(event)}</span>
                    </p>
                    {detail ? <p className="mt-0.5 text-[13px] leading-relaxed text-muted-2">{detail}</p> : null}
                  </div>
                  <div className="flex items-baseline gap-3 text-xs sm:justify-end">
                    {event.issue ? (
                      <ProjectIssueLink
                        projectKey={project.key}
                        number={event.issue.number}
                        issueKey={event.issue.key}
                        title={event.issue.title}
                      />
                    ) : (
                      <span className="text-muted-2">Project</span>
                    )}
                    <time className="tabular-nums text-muted-2" dateTime={event.occurredAt.toISOString()}>
                      {clock.format(event.occurredAt)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {page.nextCursor ? (
        <div className="mt-8 border-t border-line pt-4">
          <Link
            href={activityHref(project.key, { ...current, cursor: page.nextCursor })}
            className="text-sm font-medium text-accent-strong underline-offset-4 hover:underline"
          >
            Older activity →
          </Link>
        </div>
      ) : null}
    </>
  );
}
