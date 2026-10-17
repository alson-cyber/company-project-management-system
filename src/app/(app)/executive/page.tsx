import type { Metadata } from "next";
import Link from "next/link";
import { ActivityLog } from "@/components/reporting/activity-log";
import { PageHeader } from "@/components/ui/page-header";
import { formatDate } from "@/components/ui/format";
import { addCalendarDays, todayInTimeZone } from "@/lib/calendar";
import { listScopedActivity } from "@/modules/activity/activity.queries";
import { executableFacts } from "@/modules/reporting/report.derive";
import { companyMetrics } from "@/modules/reporting/portfolio.derive";
import { loadVisibleIssueFacts, loadVisibleProjects } from "@/modules/reporting/portfolio.queries";
import { derivePortfolio } from "@/modules/reporting/portfolio.derive";
import { listWorkspacePeople } from "@/modules/people/people.queries";
import { PROJECT_HEALTH_LABELS, PROJECT_STATUS_LABELS } from "@/modules/projects/project.constants";
import { requireWorkspacePermission } from "@/server/access/session";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "Executive" };

export default async function ExecutivePage() {
  const ctx = await requireWorkspacePermission("executive.view");
  const [projects, issues, people, activity] = await Promise.all([
    loadVisibleProjects(ctx),
    loadVisibleIssueFacts(ctx),
    listWorkspacePeople(ctx),
    listScopedActivity(ctx, { take: 8 }),
  ]);
  const timeZone = getEnv().COMPANY_TIMEZONE;
  const portfolio = derivePortfolio(projects, issues, timeZone);
  const metrics = companyMetrics(portfolio, issues, timeZone);
  const today = todayInTimeZone(timeZone);
  const completedFrom = addCalendarDays(today, -13);
  const openByPerson = new Map<string, number>();
  for (const issue of executableFacts(issues)) {
    if (issue.status !== "DONE" && issue.assigneeId) {
      openByPerson.set(issue.assigneeId, (openByPerson.get(issue.assigneeId) ?? 0) + 1);
    }
  }
  const attention = portfolio.filter((project) => project.signals.length > 0);

  return (
    <>
      <PageHeader
        title="Company delivery overview"
        description="Company-wide delivery, using the same progress and overdue rules as each project. Health is the label a project lead set."
        actions={
          <Link href="/executive/activity" className="text-[13px] font-semibold text-accent-strong hover:underline">
            Master activity
          </Link>
        }
      />

      <dl className="mb-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <Metric href="#portfolio" label="Active projects" value={metrics.activeProjects} hint="Status is Active" />
        <Metric href="/reports/status" label="Open work" value={metrics.openExecutable} hint="Executable, not Done" />
        <Metric href="/reports/overdue" label="Overdue" value={metrics.overdueExecutable} hint="Due before today" />
        <Metric href="/reports/priority?priority=HIGHEST" label="Highest open" value={metrics.highestOpen} hint="Priority is Highest" />
        <Metric href="/reports/status?status=IN_REVIEW" label="In review" value={metrics.inReview} hint="Executable, In Review" />
        <Metric
          href={`/reports/completions?range=custom&from=${completedFrom}&to=${today}`}
          label="Completed"
          value={metrics.completedRecently}
          hint="Last 14 days"
        />
        <Metric href="#attention" label="Need attention" value={metrics.projectsRequiringAttention} hint="Has a stated signal" />
      </dl>

      <section id="attention" className="mb-10 scroll-mt-6">
        <h2 className="text-base font-semibold">Management attention</h2>
        <p className="mt-1 text-sm text-muted">Each line is a rule, not a score. A lead-set health label is shown as they wrote it.</p>
        {attention.length === 0 ? <p className="mt-4 text-sm text-muted">No project currently matches an attention rule.</p> : null}
        <ul className="mt-3 divide-y divide-line/70">
          {attention.map((project) => (
            <li key={project.id} className="py-3">
              <Link href={`/projects/${project.key}`} className="text-sm font-semibold hover:underline">
                {project.name}
              </Link>
              <ul className="mt-1 grid gap-1">
                {project.signals.map((signal) => (
                  <li key={signal.kind} className="text-sm text-muted">
                    {signal.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section id="portfolio" className="mb-10 scroll-mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold">Project health</h2>
          <Link href="/reports/progress" className="text-[13px] text-accent-strong hover:underline">
            Open the progress report
          </Link>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">Project</th>
                <th className="py-2 font-medium">Health</th>
                <th className="py-2 font-medium">Progress</th>
                <th className="py-2 font-medium">Overdue</th>
                <th className="py-2 font-medium">Highest</th>
                <th className="py-2 font-medium">Review</th>
                <th className="py-2 font-medium">Target</th>
                <th className="py-2 font-medium">Lead</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((project) => (
                <tr key={project.id} className="border-b border-line/70 align-top">
                  <td className="py-3 pr-3">
                    <Link href={`/projects/${project.key}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                    <div className="text-xs text-muted">
                      {project.key} · {PROJECT_STATUS_LABELS[project.status]}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div>{project.health ? PROJECT_HEALTH_LABELS[project.health] : "Not set"}</div>
                    {project.signals[0] ? <div className="mt-1 max-w-56 text-xs text-muted">{project.signals.map((signal) => signal.text).join(" · ")}</div> : null}
                  </td>
                  <td className="py-3 pr-3 tabular-nums">
                    {project.progress.percent}%
                    <div className="text-xs text-muted">
                      {project.progress.done}/{project.progress.total}
                    </div>
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{project.overdue}</td>
                  <td className="py-3 pr-3 tabular-nums">{project.highestOpen}</td>
                  <td className="py-3 pr-3 tabular-nums">{project.inReview}</td>
                  <td className="py-3 pr-3">{project.targetDay ? formatDate(project.targetDay) : "—"}</td>
                  <td className="py-3">{project.lead?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-line/70 md:hidden">
          {portfolio.map((project) => (
            <li key={project.id} className="py-3 text-sm">
              <Link href={`/projects/${project.key}`} className="font-semibold hover:underline">
                {project.name}
              </Link>
              <p className="mt-1 text-muted">
                {project.health ? PROJECT_HEALTH_LABELS[project.health] : "Not set"} · {project.progress.percent}% · {project.overdue} overdue ·{" "}
                {project.highestOpen} highest · {project.inReview} in review
              </p>
              <p className="text-xs text-muted">
                Target {project.targetDay ? formatDate(project.targetDay) : "not set"} · {project.lead?.name ?? "No lead"}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold">Recent activity</h2>
          <Link href="/executive/activity" className="text-[13px] text-accent-strong hover:underline">
            View the log
          </Link>
        </div>
        <ActivityLog rows={activity.rows} empty="No activity in projects you can see." />
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold">People</h2>
          <Link href="/team" className="text-[13px] text-accent-strong hover:underline">
            Team directory
          </Link>
        </div>
        <p className="mb-2 text-sm text-muted">Open assigned executable work. Alphabetical. Not a ranking.</p>
        <ul className="divide-y divide-line/70">
          {people.map((person) => (
            <li key={person.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <Link href={`/team/${person.id}`} className="font-medium hover:underline">
                {person.name}
              </Link>
              <span className="text-xs text-muted">{openByPerson.get(person.id) ?? 0} open</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Metric({ href, label, value, hint }: { href: string; label: string; value: number; hint: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd>
        <Link href={href} className="text-xl font-semibold tabular-nums tracking-tight hover:underline">
          {value}
        </Link>
        <div className="text-[11px] text-muted">{hint}</div>
      </dd>
    </div>
  );
}
