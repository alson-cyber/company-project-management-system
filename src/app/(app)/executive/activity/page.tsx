import type { Metadata } from "next";
import Link from "next/link";
import { ActivityLog } from "@/components/reporting/activity-log";
import { FilterField, TextFilter } from "@/components/reporting/filters";
import { PageHeader } from "@/components/ui/page-header";
import { ACTIVITY_ACTIONS } from "@/modules/activity/activity.types";
import { activityActionLabel } from "@/modules/activity/activity.format";
import { isActivityAction, listScopedActivity } from "@/modules/activity/activity.queries";
import { ISSUE_TYPES, ISSUE_TYPE_LABELS } from "@/modules/issues/issue.constants";
import { listWorkspacePeople } from "@/modules/people/people.queries";
import { loadVisibleProjects } from "@/modules/reporting/portfolio.queries";
import { parseReportFilters, reportQuery } from "@/modules/reporting/reports.model";
import { companyToday } from "@/modules/reporting/trend.queries";
import { requireWorkspacePermission } from "@/server/access/session";

export const metadata: Metadata = { title: "Master activity" };

export default async function ExecutiveActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireWorkspacePermission("executive.view");
  const filters = parseReportFilters(await searchParams, companyToday());
  const [projects, people] = await Promise.all([loadVisibleProjects(ctx), listWorkspacePeople(ctx)]);
  const project = filters.projectKey ? projects.find((item) => item.key === filters.projectKey) : undefined;
  const issue = filters.issueKey?.match(/^([A-Z][A-Z0-9]+)-(\d+)$/);
  const issueProject = issue ? projects.find((item) => item.key === issue[1]) : undefined;
  const page = await listScopedActivity(ctx, {
    projectId: issueProject?.id ?? project?.id,
    actorId: filters.actorId ?? undefined,
    action: filters.action && isActivityAction(filters.action) ? filters.action : undefined,
    issueType: filters.issueType ?? undefined,
    issueNumber: issue ? Number(issue[2]) : undefined,
    from: filters.from,
    to: filters.to,
    cursor: filters.cursor ?? undefined,
  });

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/executive" className="text-[13px] text-muted hover:underline">
            Executive
          </Link>
        }
        title="Master activity"
        description="The company audit log for projects you can see. It is append-only and paged, newest first."
      />
      <form action="/executive/activity" className="mb-6 flex flex-wrap items-end gap-3">
        <FilterField label="Project" name="project" value={filters.projectKey ?? ""}>
          <option value="">All projects</option>
          {projects.map((item) => (
            <option key={item.id} value={item.key}>
              {item.name}
            </option>
          ))}
        </FilterField>
        <FilterField label="Person" name="actor" value={filters.actorId ?? ""}>
          <option value="">Anyone</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
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
        <FilterField label="Action" name="action" value={filters.action ?? ""}>
          <option value="">Any action</option>
          {ACTIVITY_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {activityActionLabel(action)}
            </option>
          ))}
        </FilterField>
        <FilterField label="Range" name="range" value={filters.range}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="custom">Custom</option>
        </FilterField>
        <TextFilter label="From" name="from" value={filters.range === "custom" ? filters.from : ""} />
        <TextFilter label="To" name="to" value={filters.range === "custom" ? filters.to : ""} />
        <TextFilter label="Issue key" name="issue" value={filters.issueKey ?? ""} />
        <button type="submit" className="h-10 px-3 text-[13px] font-semibold text-accent-strong hover:underline">
          Apply
        </button>
      </form>
      <p className="mb-3 text-xs text-muted">
        {filters.from} to {filters.to}, company time. {page.rows.length} events on this page.
      </p>
      <ActivityLog rows={page.rows} empty="No activity matches these filters." />
      {page.nextCursor ? (
        <Link href={`/executive/activity${reportQuery(filters, { cursor: page.nextCursor })}`} className="mt-4 inline-block text-sm font-medium hover:underline">
          Older activity
        </Link>
      ) : null}
    </>
  );
}
