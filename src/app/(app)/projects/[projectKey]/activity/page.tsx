import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectIssueLink } from "@/components/projects/project-issue-link";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { formatDateTime } from "@/components/ui/format";
import { activityActionLabel, activityDetail, activityKind, describeActivity } from "@/modules/activity/activity.format";
import { isActivityAction, listFilteredProjectActivity, type ProjectActivityFilter } from "@/modules/activity/activity.queries";
import { ACTIVITY_ACTIONS } from "@/modules/activity/activity.types";
import { parseIssueKey } from "@/modules/issues/issue.keys";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { requireAuthContext } from "@/server/access/session";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string }> }): Promise<Metadata> {
  const { projectKey } = await params;
  return { title: `${projectKey.toUpperCase()} · Activity` };
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function isDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
  const from = first(query.from);
  const to = first(query.to);
  const parsedKey = parseIssueKey(issue);
  const issueNumber = parsedKey?.projectKey === project.key ? parsedKey.number : /^\d+$/.test(issue) ? Number(issue) : undefined;
  const filter: ProjectActivityFilter = {
    ...(person ? { actorId: person } : {}),
    ...(isActivityAction(action) ? { action } : {}),
    ...(issueNumber ? { issueNumber } : {}),
    ...(isDay(from) ? { from } : {}),
    ...(isDay(to) ? { to } : {}),
  };
  const events = await listFilteredProjectActivity(ctx, project.id, filter, 100);
  const filtering = Boolean(person || action || issue || from || to);

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="activity" />
      <p className="mb-3 text-xs text-muted">Recorded changes for this project. This is history, not an inbox.</p>
      <form method="get" aria-label="Activity filters" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-medium text-muted">
          Person
          <select name="person" defaultValue={person} aria-label="Person" className="h-10 min-w-40 border border-line bg-surface px-2 text-sm">
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
          <select name="action" defaultValue={action} aria-label="Action" className="h-10 min-w-40 border border-line bg-surface px-2 text-sm">
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
            className="h-10 w-32 border border-line bg-surface px-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          From
          <input name="from" type="date" defaultValue={from} aria-label="From" className="h-10 border border-line bg-surface px-2 text-sm" />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          To
          <input name="to" type="date" defaultValue={to} aria-label="To" className="h-10 border border-line bg-surface px-2 text-sm" />
        </label>
        <button type="submit" className="h-10 px-3 text-[13px] font-semibold text-accent-strong hover:underline">
          Apply
        </button>
        {filtering ? (
          <a href={`/projects/${project.key}/activity`} className="h-10 px-2 text-[13px] leading-10 text-muted">
            Reset
          </a>
        ) : null}
      </form>
      {events.length === 0 ? (
        <p className="text-sm text-muted">{filtering ? "No activity matches these filters." : "No activity yet."}</p>
      ) : (
        <ol className="divide-y divide-line/70">
          {events.map((event) => (
            <li key={event.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">{activityKind(event)}</span>
              <div>
                <p>
                  <span className="font-semibold">{event.actorName ?? "System"}</span>{" "}
                  <span className="text-muted">{describeActivity(event)}</span>
                </p>
                {activityDetail(event) ? <p className="text-[13px] text-muted">{activityDetail(event)}</p> : null}
                {event.issue ? (
                  <p className="mt-1">
                    <ProjectIssueLink
                      projectKey={project.key}
                      number={event.issue.number}
                      issueKey={event.issue.key}
                      title={event.issue.title}
                    />
                  </p>
                ) : (
                  <p className="mt-1 text-[13px] text-muted">Project</p>
                )}
                <time className="text-xs text-muted-2" dateTime={event.occurredAt.toISOString()}>
                  {formatDateTime(event.occurredAt)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
