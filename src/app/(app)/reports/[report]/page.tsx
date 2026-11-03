import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Distribution } from "@/components/reporting/distribution";
import { ActivityLog } from "@/components/reporting/activity-log";
import { DateFilter, FilterField } from "@/components/reporting/filters";
import { ReportFilterForm } from "@/components/reporting/report-filter-form";
import { formatDate, formatDateTime } from "@/components/ui/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatGrid, StatTile } from "@/components/ui/stat-tile";
import { isActivityAction, listScopedActivity } from "@/modules/activity/activity.queries";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, ISSUE_TYPES, ISSUE_PRIORITY_LABELS, ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS } from "@/modules/issues/issue.constants";
import { listWorkspacePeople } from "@/modules/people/people.queries";
import { PROJECT_HEALTH_LABELS } from "@/modules/projects/project.constants";
import { derivePortfolio, type IssueFact, type PortfolioProject } from "@/modules/reporting/portfolio.derive";
import { loadVisibleIssueFacts, loadVisibleProjects } from "@/modules/reporting/portfolio.queries";
import { applyIssueFilters, assigneeRows, overdueRows, priorityRows, statusCounts, typeCounts } from "@/modules/reporting/report.derive";
import { isReportId, parseReportFilters, REPORTS, reportQuery, type ReportFilters } from "@/modules/reporting/reports.model";
import { companyToday, completionTrend, listVisibleCompletionEvidence } from "@/modules/reporting/trend.queries";
import type { AuthContext } from "@/server/access/types";
import { requireAuthContext } from "@/server/access/session";
import { getEnv } from "@/server/env";
import { ProjectName } from "@/components/projects/project-name";
import { FilterApplyButton } from "@/components/ui/filter-fields";

export async function generateMetadata({ params }: { params: Promise<{ report: string }> }): Promise<Metadata> {
  const { report } = await params;
  const definition = REPORTS.find((item) => item.id === report);
  return { title: definition ? definition.title : "Reports" };
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ report: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { report } = await params;
  if (!isReportId(report)) notFound();
  const definition = REPORTS.find((item) => item.id === report)!;
  const ctx = await requireAuthContext();
  const filters = parseReportFilters(await searchParams, companyToday());
  const timeZone = getEnv().COMPANY_TIMEZONE;

  // Read issues only for reports that work from them. Activity and completions read their own data,
  // so they skip the full issue read entirely.
  const needsIssues = report !== "activity" && report !== "completions";
  const [projects, issues, people] = await Promise.all([
    loadVisibleProjects(ctx),
    needsIssues ? loadVisibleIssueFacts(ctx) : Promise.resolve<IssueFact[]>([]),
    listWorkspacePeople(ctx),
  ]);
  // One derivation from the same issue read, instead of reading the issues a second time.
  const portfolio: PortfolioProject[] = needsIssues ? derivePortfolio(projects, issues, timeZone, new Date()) : [];
  const visibleProjects = filters.projectKey ? portfolio.filter((project) => project.key === filters.projectKey) : portfolio;
  const visibleProjectIds = (filters.projectKey ? projects.filter((project) => project.key === filters.projectKey) : projects).map(
    (project) => project.id,
  );
  const filteredIssues = needsIssues ? applyIssueFilters(issues, portfolio, filters) : [];
  const query = reportQuery(filters);
  const exportHref = `/api/reports/export${query ? `${query}&` : "?"}report=${exportKind(report)}`;

  // The two completion reads are independent, so they run together.
  const completions =
    report === "completions"
      ? await Promise.all([completionTrend(ctx, visibleProjectIds, filters), listVisibleCompletionEvidence(ctx, filters)])
      : null;

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/reports" className="text-[13px] text-muted hover:underline">
            Reports
          </Link>
        }
        title={definition.title}
        description={definition.definition}
        actions={
          canExport(report) ? (
            <a href={exportHref} className="text-[13px] font-semibold text-accent-strong hover:underline">
              Export CSV
            </a>
          ) : null
        }
      />
      <FilterBar filters={filters} report={report} projects={projects} people={people} usesDateRange={definition.usesDateRange} />
      {needsIssues ? <Summary issues={filteredIssues} portfolio={portfolio} timeZone={timeZone} /> : null}

      <Card>
        <section aria-labelledby="report-results">
          <CardHeader id="report-results" title="Results" description={resultLabel(report, visibleProjects.length, filteredIssues.length)} />
          <CardBody>
            {projects.length === 0 ? <p className="text-sm text-muted">You cannot see any projects, so this report is empty.</p> : null}
            {report === "progress" ? <ProgressTable projects={visibleProjects} /> : null}
            {report === "status" ? <Distribution items={ISSUE_STATUSES.map((status) => ({ label: ISSUE_STATUS_LABELS[status], count: statusCounts(filteredIssues)[status] }))} /> : null}
            {report === "overdue" ? <OverdueTable rows={overdueRows(filteredIssues, portfolio, timeZone)} /> : null}
            {report === "priority" ? <PriorityTable rows={priorityRows(filteredIssues, portfolio)} /> : null}
            {report === "assignees" ? <AssigneeTable rows={assigneeRows(filteredIssues, timeZone)} /> : null}
            {report === "types" ? <Distribution items={ISSUE_TYPES.map((type) => ({ label: ISSUE_TYPE_LABELS[type], count: typeCounts(filteredIssues)[type] }))} /> : null}
            {completions ? <Completions points={completions[0]} evidence={completions[1]} /> : null}
            {report === "activity" ? <ActivityReport ctx={ctx} projects={projects} filters={filters} /> : null}
          </CardBody>
        </section>
      </Card>
    </>
  );
}

function canExport(report: string): boolean {
  return report === "progress" || report === "overdue" || report === "activity" || report === "completions";
}

function exportKind(report: string): string {
  if (report === "completions") return "contributions";
  return report;
}

function countLabel(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function resultLabel(report: string, projectCount: number, issueCount: number): string | undefined {
  if (report === "progress") return countLabel(projectCount, "project");
  if (report === "activity" || report === "completions") return undefined;
  return countLabel(issueCount, "issue") + " match these filters";
}

/** Headline numbers for issue reports, so the page opens on the answer. */
function Summary({ issues, portfolio, timeZone }: { issues: IssueFact[]; portfolio: PortfolioProject[]; timeZone: string }) {
  const open = issues.filter((issue) => issue.status !== "DONE").length;
  const inReview = issues.filter((issue) => issue.status === "IN_REVIEW").length;
  const done = issues.filter((issue) => issue.status === "DONE").length;
  const overdue = overdueRows(issues, portfolio, timeZone).length;
  return (
    <StatGrid className="mb-6">
      <StatTile icon="stack" label="Open" value={open} hint="Not yet done" />
      <StatTile icon="alert" tone="danger" emphasise={overdue > 0} label="Overdue" value={overdue} hint="Past the due date" />
      <StatTile icon="eye" tone="purple" label="In review" value={inReview} hint="Waiting for a check" />
      <StatTile icon="check" tone="success" label="Done" value={done} hint="Finished work" />
    </StatGrid>
  );
}

function FilterBar({
  filters,
  report,
  projects,
  people,
  usesDateRange,
}: {
  filters: ReportFilters;
  report: string;
  projects: { id: string; key: string; name: string }[];
  people: { id: string; name: string }[];
  usesDateRange: boolean;
}) {
  return (
    <ReportFilterForm
      action={`/reports/${report}`}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card"
    >
      <FilterField label="Project" name="project" value={filters.projectKey ?? ""}>
        <option value="">Accessible projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.key}>
            {project.name}
          </option>
        ))}
      </FilterField>
      <FilterField label="Assignee" name="assignee" value={filters.assigneeId ?? ""}>
        <option value="">Anyone</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </FilterField>
      {report === "activity" ? (
        <FilterField label="Person" name="actor" value={filters.actorId ?? ""}>
          <option value="">Anyone</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </FilterField>
      ) : null}
      <FilterField label="Status" name="status" value={filters.status ?? ""}>
        <option value="">Any status</option>
        {ISSUE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {ISSUE_STATUS_LABELS[status]}
          </option>
        ))}
      </FilterField>
      <FilterField label="Priority" name="priority" value={filters.priority ?? ""}>
        <option value="">Any priority</option>
        {ISSUE_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {ISSUE_PRIORITY_LABELS[priority]}
          </option>
        ))}
      </FilterField>
      <FilterField label="Issue type" name="type" value={filters.issueType ?? ""}>
        <option value="">Any type</option>
        {ISSUE_TYPES.map((type) => (
          <option key={type} value={type}>
            {ISSUE_TYPE_LABELS[type]}
          </option>
        ))}
      </FilterField>
      {usesDateRange ? (
        <>
          <FilterField label="Range" name="range" value={filters.range}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom</option>
          </FilterField>
          <DateFilter label="From" name="from" value={filters.range === "custom" ? filters.from : ""} />
          <DateFilter label="To" name="to" value={filters.range === "custom" ? filters.to : ""} />
        </>
      ) : null}
      <FilterApplyButton>Apply filters</FilterApplyButton>
    </ReportFilterForm>
  );
}

function ProgressTable({ projects }: { projects: PortfolioProject[] }) {
  if (projects.length === 0) return <p className="text-sm text-muted">No projects match this filter.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Project progress</caption>
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th className="py-2 font-medium">Project</th>
            <th className="py-2 font-medium">Health</th>
            <th className="py-2 font-medium">Progress</th>
            <th className="py-2 font-medium">Open</th>
            <th className="py-2 font-medium">Done</th>
            <th className="py-2 font-medium">Target</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className="border-b border-line/70 transition-colors hover:bg-surface-2">
              <td className="py-2.5">
                <Link href={`/projects/${project.key}`} className="font-medium hover:underline">
                  <ProjectName name={project.name} color={project.color} />
                </Link>
              </td>
              <td className="py-2.5">{project.health ? PROJECT_HEALTH_LABELS[project.health] : "Not set"}</td>
              <td className="py-2.5 tabular-nums">{project.progress.percent}%</td>
              <td className="py-2.5 tabular-nums">{project.openExecutable}</td>
              <td className="py-2.5 tabular-nums">{project.doneExecutable}</td>
              <td className="py-2.5">{project.targetDay ? formatDate(project.targetDay) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverdueTable({ rows }: { rows: ReturnType<typeof overdueRows> }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Nothing is overdue.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-sm">
        <caption className="sr-only">Overdue executable work</caption>
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th className="py-2 font-medium">Issue</th>
            <th className="py-2 font-medium">Project</th>
            <th className="py-2 font-medium">Assignee</th>
            <th className="py-2 font-medium">Priority</th>
            <th className="py-2 font-medium">Due</th>
            <th className="py-2 font-medium">Overdue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line/70 transition-colors hover:bg-surface-2">
              <td className="py-2.5">
                <Link href={`/issues/${row.key}`} className="hover:underline">
                  <span className="mr-2 font-mono text-xs text-muted">{row.key}</span>
                  {row.title}
                </Link>
              </td>
              <td className="py-2.5">{row.projectName}</td>
              <td className="py-2.5">{row.assigneeName ?? "Unassigned"}</td>
              <td className="py-2.5">{ISSUE_PRIORITY_LABELS[row.priority as keyof typeof ISSUE_PRIORITY_LABELS]}</td>
              <td className="py-2.5">{formatDate(row.dueDate)}</td>
              <td className="py-2.5 font-semibold tabular-nums text-danger">{row.overdueDays}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriorityTable({ rows }: { rows: ReturnType<typeof priorityRows> }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No open High or Highest work matches this filter.</p>;
  return (
    <ul className="divide-y divide-line/70">
      {rows.map((row) => (
        <li key={row.id} className="-mx-2 rounded-lg px-2 py-3 text-sm transition-colors hover:bg-surface-2">
          <Link href={`/issues/${row.key}`} className="font-medium hover:underline">
            <span className="mr-2 font-mono text-xs text-muted">{row.key}</span>
            {row.title}
          </Link>
          <p className="mt-0.5 text-xs text-muted">
            {row.projectName} · {ISSUE_PRIORITY_LABELS[row.priority as keyof typeof ISSUE_PRIORITY_LABELS]} · {row.assigneeName ?? "Unassigned"} ·{" "}
            {ISSUE_STATUS_LABELS[row.status]}
          </p>
        </li>
      ))}
    </ul>
  );
}

function AssigneeTable({ rows }: { rows: ReturnType<typeof assigneeRows> }) {
  if (rows.length === 0) return <p className="text-sm text-muted">No assigned executable work matches this filter.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="sr-only">Executable work by current assignee</caption>
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th className="py-2 font-medium">Person</th>
            <th className="py-2 font-medium">Open</th>
            <th className="py-2 font-medium">In review</th>
            <th className="py-2 font-medium">Done</th>
            <th className="py-2 font-medium">Overdue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-line/70 transition-colors hover:bg-surface-2">
              <td className="py-2.5">
                {row.assigneeId ? (
                  <Link href={`/team/${row.assigneeId}`} className="font-medium hover:underline">
                    {row.name}
                  </Link>
                ) : (
                  row.name
                )}
              </td>
              <td className="py-2.5 tabular-nums">{row.open}</td>
              <td className="py-2.5 tabular-nums">{row.inReview}</td>
              <td className="py-2.5 tabular-nums">{row.done}</td>
              <td className="py-2.5 tabular-nums">{row.overdue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function ActivityReport({
  ctx,
  projects,
  filters,
}: {
  ctx: AuthContext;
  projects: { id: string; key: string }[];
  filters: ReportFilters;
}) {
  const project = filters.projectKey ? projects.find((item) => item.key === filters.projectKey) : undefined;
  const page = await listScopedActivity(ctx, {
    projectId: project?.id,
    actorId: filters.actorId ?? undefined,
    action: filters.action && isActivityAction(filters.action) ? filters.action : undefined,
    issueType: filters.issueType ?? undefined,
    from: filters.from,
    to: filters.to,
    cursor: filters.cursor ?? undefined,
  });
  return (
    <>
      <ActivityLog rows={page.rows} empty="No activity in this date range." />
      {page.nextCursor ? (
        <Link href={`/reports/activity${reportQuery(filters, { cursor: page.nextCursor })}`} className="mt-4 inline-block text-sm font-medium hover:underline">
          Older activity
        </Link>
      ) : null}
    </>
  );
}

function Completions({
  points,
  evidence,
}: {
  points: { day: string; count: number }[];
  evidence: { actorName: string | null; issueKey: string; issueTitle: string; occurredAt: Date }[];
}) {
  const total = points.reduce((sum, point) => sum + point.count, 0);
  return (
    <div className="grid gap-8">
      {total === 0 ? (
        <p className="text-sm text-muted">No completions in this date range.</p>
      ) : (
        <Distribution items={points.filter((point) => point.count > 0).map((point) => ({ label: formatDate(point.day), count: point.count }))} />
      )}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Completion evidence</h2>
        {evidence.length === 0 ? <p className="text-sm text-muted">No completion events in this window.</p> : null}
        <ul className="divide-y divide-line/70">
          {evidence.map((row) => (
            <li key={`${row.issueKey}-${row.occurredAt.toISOString()}`} className="py-2.5 text-sm">
              <span className="font-medium">{row.actorName ?? "Someone"}</span> completed{" "}
              <Link href={`/issues/${row.issueKey}`} className="font-mono text-xs hover:underline">
                {row.issueKey}
              </Link>{" "}
              {row.issueTitle}
              <span className="ml-2 text-xs text-muted">{formatDateTime(row.occurredAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
