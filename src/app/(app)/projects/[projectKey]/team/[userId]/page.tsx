import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectIssueLink } from "@/components/projects/project-issue-link";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { formatDateTime } from "@/components/ui/format";
import { IssueStatusBadge } from "@/components/ui/issue-badges";
import { activityDetail, describeActivity } from "@/modules/activity/activity.format";
import { listFilteredProjectActivity } from "@/modules/activity/activity.queries";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { memberFacts, type AttentionItem } from "@/modules/projects/workspace.model";
import { listMemberWriting, listProjectWorkspaceIssues } from "@/modules/projects/workspace.queries";
import { requireAuthContext } from "@/server/access/session";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string; userId: string }> }): Promise<Metadata> {
  const { projectKey } = await params;
  return { title: `${projectKey.toUpperCase()} · Team` };
}

export default async function TeamMemberPage({ params }: { params: Promise<{ projectKey: string; userId: string }> }) {
  const { projectKey, userId } = await params;
  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();
  const member = project.members.find((person) => person.userId === userId);
  if (!member) notFound();

  const [issues, activity, writing] = await Promise.all([
    listProjectWorkspaceIssues(ctx, project.id),
    listFilteredProjectActivity(ctx, project.id, { actorId: userId }, 20),
    listMemberWriting(ctx, project.id, project.key, userId),
  ]);
  const facts = memberFacts(userId, issues);

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="team" />
      <p className="mb-4 text-sm">
        <Link href={`/projects/${project.key}/team`} className="font-medium text-accent-strong hover:underline">
          Team
        </Link>
        <span className="text-muted"> / {member.name}</span>
      </p>
      <header className="mb-6">
        <h2 className="text-lg font-semibold">{member.name}</h2>
        <p className="text-sm text-muted">
          {member.role === "LEAD" ? "Project lead" : "Member"}
          {member.jobTitle ? ` · ${member.jobTitle}` : ""}
          {member.status === "DEACTIVATED" ? " · Deactivated" : ""}
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-2">
        <IssueGroup projectKey={project.key} title="Current work" empty="No open work is assigned." items={facts.openAssigned} />
        <IssueGroup projectKey={project.key} title="Overdue assigned work" empty="No overdue work is assigned." items={facts.overdueAssigned} />
        <IssueGroup projectKey={project.key} title="Completed" empty="No recorded completions in this project." items={facts.completed} />
        <IssueGroup projectKey={project.key} title="Created" empty="No issues created in this project." items={facts.created} />
        <section aria-labelledby="member-activity">
          <h3 id="member-activity" className="text-sm font-semibold">Recent activity</h3>
          {activity.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No activity in this project.</p>
          ) : (
            <ol className="mt-2 divide-y divide-line/70">
              {activity.map((event) => (
                <li key={event.id} className="py-2 text-[13px]">
                  <p>{describeActivity(event)}</p>
                  {activityDetail(event) ? <p className="text-muted">{activityDetail(event)}</p> : null}
                  {event.issue ? (
                    <ProjectIssueLink projectKey={project.key} number={event.issue.number} issueKey={event.issue.key} title={event.issue.title} />
                  ) : null}
                  <time className="block text-xs text-muted-2" dateTime={event.occurredAt.toISOString()}>
                    {formatDateTime(event.occurredAt)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section aria-labelledby="member-writing" className="grid gap-4">
          <h3 id="member-writing" className="text-sm font-semibold">Comments and notes</h3>
          <Writing title="Comments" empty="No comments in this project." rows={writing.comments} projectKey={project.key} />
          <Writing title="Notes" empty="No notes in this project." rows={writing.notes} projectKey={project.key} />
        </section>
      </div>
    </>
  );
}

function IssueGroup({
  projectKey,
  title,
  empty,
  items,
}: {
  projectKey: string;
  title: string;
  empty: string;
  items: AttentionItem[];
}) {
  const id = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="text-sm font-semibold">
        {title} <span className="font-normal text-muted">{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line/70">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-2 py-2">
              <ProjectIssueLink projectKey={projectKey} number={item.number} issueKey={item.key} title={item.title} />
              <IssueStatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Writing({
  title,
  empty,
  rows,
  projectKey,
}: {
  title: string;
  empty: string;
  projectKey: string;
  rows: Array<{ id: string; excerpt: string; createdAt: Date; issue: { key: string; number: number; title: string } }>;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      {rows.length === 0 ? (
        <p className="mt-1 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-1 divide-y divide-line/70">
          {rows.map((row) => (
            <li key={row.id} className="py-2 text-[13px]">
              <p>{row.excerpt}</p>
              <ProjectIssueLink projectKey={projectKey} number={row.issue.number} issueKey={row.issue.key} title={row.issue.title} />
              <time className="block text-xs text-muted-2" dateTime={row.createdAt.toISOString()}>
                {formatDateTime(row.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
