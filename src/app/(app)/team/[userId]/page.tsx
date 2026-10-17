import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityLog } from "@/components/reporting/activity-log";
import { Avatar } from "@/components/ui/avatar";
import { formatDateTime } from "@/components/ui/format";
import { PageHeader } from "@/components/ui/page-header";
import { addCalendarDays } from "@/lib/calendar";
import { listScopedActivity } from "@/modules/activity/activity.queries";
import { ISSUE_STATUS_LABELS } from "@/modules/issues/issue.constants";
import { issueKey } from "@/modules/issues/issue.keys";
import { getWorkspacePerson } from "@/modules/people/people.queries";
import { executableFacts } from "@/modules/reporting/report.derive";
import { loadVisibleIssueFacts, loadVisibleProjects } from "@/modules/reporting/portfolio.queries";
import { companyToday, listVisibleCompletionEvidence, type CompletionEvidence } from "@/modules/reporting/trend.queries";
import { parseReportFilters } from "@/modules/reporting/reports.model";
import { requireAuthContext } from "@/server/access/session";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  return { title: `Team · ${userId.slice(0, 8)}` };
}

export default async function PersonPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const ctx = await requireAuthContext();
  const person = await getWorkspacePerson(ctx, userId);
  if (!person) notFound();
  const today = companyToday();
  const filters = parseReportFilters({ range: "30", actor: person.id }, today);
  const [projects, issues, activity, completed] = await Promise.all([
    loadVisibleProjects(ctx),
    loadVisibleIssueFacts(ctx),
    listScopedActivity(ctx, { actorId: person.id, from: addCalendarDays(today, -29), to: today, take: 15 }),
    listVisibleCompletionEvidence(ctx, filters, 20),
  ]);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const current = executableFacts(issues).filter((issue) => issue.assigneeId === person.id && issue.status !== "DONE");
  const recentCompletions = completed.filter((row) => row.actorUserId === person.id);

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/team" className="text-[13px] text-muted hover:underline">
            Team
          </Link>
        }
        title={person.name}
        description={[person.jobTitle, person.email].filter(Boolean).join(" · ") || "Workspace member"}
      />
      <div className="mb-6 flex items-center gap-3">
        <Avatar name={person.name} />
        <p className="text-sm text-muted">What this person is contributing to, in projects you can see. This is not a performance score.</p>
      </div>

      <Section title="Current work">
        {current.length === 0 ? <p className="text-sm text-muted">No open executable work is assigned to them in projects you can see.</p> : null}
        <ul className="divide-y divide-line/70">
          {current.map((issue) => {
            const project = projectById.get(issue.projectId);
            const key = issueKey(project?.key ?? "", issue.number);
            return (
              <li key={issue.id} className="py-2 text-sm">
                <Link href={`/issues/${key}`} className="font-medium hover:underline">
                  <span className="mr-2 text-muted">{key}</span>
                  {issue.title}
                </Link>
                <p className="text-xs text-muted">
                  {project?.name} · {ISSUE_STATUS_LABELS[issue.status]}
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Recently completed">
        <p className="mb-2 text-xs text-muted">Completions they performed in the last 30 days. Reassignment does not move this credit.</p>
        {recentCompletions.length === 0 ? <p className="text-sm text-muted">No completions by them in this window.</p> : null}
        <CompletionList rows={recentCompletions} />
      </Section>

      <Section title="Projects">
        {person.projects.length === 0 ? <p className="text-sm text-muted">No shared projects.</p> : null}
        <ul className="divide-y divide-line/70">
          {person.projects.map((project) => (
            <li key={project.key} className="flex items-center justify-between gap-3 py-3 text-sm">
              <Link href={`/projects/${project.key}`} className="font-medium hover:underline">
                <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: project.color }} aria-hidden="true" />
                {project.name}
                <span className="ml-2 text-muted">{project.key}</span>
              </Link>
              <span className="text-xs text-muted">{project.role === "LEAD" ? "Project lead" : "Member"}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Recent activity">
        <ActivityLog rows={activity.rows} empty="No activity by them in the last 30 days." />
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function CompletionList({ rows }: { rows: CompletionEvidence[] }) {
  return (
    <ul className="divide-y divide-line/70">
      {rows.map((row) => (
        <li key={`${row.issueKey}-${row.occurredAt.toISOString()}`} className="py-2 text-sm">
          <Link href={`/issues/${row.issueKey}`} className="hover:underline">
            {row.issueKey}
          </Link>{" "}
          {row.issueTitle}
          <span className="ml-2 text-xs text-muted">{formatDateTime(row.occurredAt)}</span>
        </li>
      ))}
    </ul>
  );
}
