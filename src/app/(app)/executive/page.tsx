import type { Metadata } from "next";
import Link from "next/link";
import { ActivityLog } from "@/components/reporting/activity-log";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatGrid, StatTile } from "@/components/ui/stat-tile";
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
          <Link
            href="/executive/activity"
            className="text-[13px] font-semibold text-accent-strong hover:underline"
          >
            Master activity
          </Link>
        }
      />

      <StatGrid className="mb-6">
        <StatTile
          icon="folder"
          href="#portfolio"
          label="Active projects"
          value={metrics.activeProjects}
          hint="Status is Active"
        />
        <StatTile
          icon="stack"
          tone="info"
          href="/reports/status"
          label="Open work"
          value={metrics.openExecutable}
          hint="Executable, not Done"
        />
        <StatTile
          icon="alert"
          tone="danger"
          emphasise={metrics.overdueExecutable > 0}
          href="/reports/overdue"
          label="Overdue"
          value={metrics.overdueExecutable}
          hint="Due before today"
        />
        <StatTile
          icon="flag"
          tone="warning"
          emphasise={metrics.highestOpen > 0}
          href="/reports/priority?priority=HIGHEST"
          label="Highest open"
          value={metrics.highestOpen}
          hint="Priority is Highest"
        />
        <StatTile
          icon="eye"
          tone="purple"
          href="/reports/status?status=IN_REVIEW"
          label="In review"
          value={metrics.inReview}
          hint="Executable, In Review"
        />
        <StatTile
          icon="check"
          tone="success"
          href={`/reports/completions?range=custom&from=${completedFrom}&to=${today}`}
          label="Completed"
          value={metrics.completedRecently}
          hint="Last 14 days"
        />
        <StatTile
          icon="bell"
          tone="danger"
          emphasise={metrics.projectsRequiringAttention > 0}
          href="#attention"
          label="Need attention"
          value={metrics.projectsRequiringAttention}
          hint="Has a stated signal"
        />
      </StatGrid>

      <div className="grid gap-6">
        <Card>
          <section id="attention" className="scroll-mt-6">
            <CardHeader
              title="Management attention"
              description="Each line is a rule, not a score. A lead-set health label is shown as they wrote it."
            />
            <CardBody>
              {attention.length === 0 ? (
                <p className="text-sm text-muted">No project currently matches an attention rule.</p>
              ) : null}
              <ul className="grid gap-2 sm:grid-cols-2">
                {attention.map((project) => (
                  <li key={project.id} className="rounded-xl border border-line bg-surface-2 p-3">
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
            </CardBody>
          </section>
        </Card>

        <Card>
          <section id="portfolio" className="scroll-mt-6">
            <CardHeader
              title="Project health"
              action={
                <Link
                  href="/reports/progress"
                  className="text-[13px] font-medium text-accent-strong hover:underline"
                >
                  Open the progress report
                </Link>
              }
            />
            <CardBody>
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
                          {project.signals[0] ? (
                            <div className="mt-1 max-w-56 text-xs text-muted">
                              {project.signals.map((signal) => signal.text).join(" · ")}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 pr-3 tabular-nums">
                          <div className="flex items-center gap-2.5">
                            <ProgressRing percent={project.progress.percent} size={28} />
                            <div>
                              {project.progress.percent}%
                              <div className="text-xs text-muted">
                                {project.progress.done}/{project.progress.total}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 tabular-nums">{project.overdue}</td>
                        <td className="py-3 pr-3 tabular-nums">{project.highestOpen}</td>
                        <td className="py-3 pr-3 tabular-nums">{project.inReview}</td>
                        <td className="py-3 pr-3">
                          {project.targetDay ? formatDate(project.targetDay) : "—"}
                        </td>
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
                      {project.health ? PROJECT_HEALTH_LABELS[project.health] : "Not set"} ·{" "}
                      {project.progress.percent}% · {project.overdue} overdue · {project.highestOpen} highest
                      · {project.inReview} in review
                    </p>
                    <p className="text-xs text-muted">
                      Target {project.targetDay ? formatDate(project.targetDay) : "not set"} ·{" "}
                      {project.lead?.name ?? "No lead"}
                    </p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </section>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader
              title="Recent activity"
              action={
                <Link
                  href="/executive/activity"
                  className="text-[13px] font-medium text-accent-strong hover:underline"
                >
                  View the log
                </Link>
              }
            />
            <CardBody>
              <ActivityLog rows={activity.rows} empty="No activity in projects you can see." />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="People"
              description="Open assigned executable work. Alphabetical. Not a ranking."
              action={
                <Link href="/team" className="text-[13px] font-medium text-accent-strong hover:underline">
                  Directory
                </Link>
              }
            />
            <CardBody>
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
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
