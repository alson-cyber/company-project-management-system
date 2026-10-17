import { activityActionLabel, activityChangeDetail, describeActivity } from "@/modules/activity/activity.format";
import { listScopedActivity } from "@/modules/activity/activity.queries";
import { overdueRows } from "@/modules/reporting/report.derive";
import { loadVisibleIssueFacts, loadVisiblePortfolio } from "@/modules/reporting/portfolio.queries";
import { csvFilename, toCsv } from "@/modules/reporting/csv";
import { parseReportFilters } from "@/modules/reporting/reports.model";
import { companyToday, listVisibleCompletionEvidence } from "@/modules/reporting/trend.queries";
import { PROJECT_HEALTH_LABELS } from "@/modules/projects/project.constants";
import { getActionAuthContext } from "@/server/access/session";
import { getEnv } from "@/server/env";
import { UnauthenticatedError } from "@/server/errors";

const EXPORTS = ["progress", "overdue", "activity", "contributions"] as const;
type ExportId = (typeof EXPORTS)[number];

export async function GET(request: Request) {
  try {
    const ctx = await getActionAuthContext();
    const url = new URL(request.url);
    const report = url.searchParams.get("report");
    if (!report || !(EXPORTS as readonly string[]).includes(report)) {
      return Response.json({ error: "Unknown report." }, { status: 404 });
    }
    const filters = parseReportFilters(Object.fromEntries(url.searchParams.entries()), companyToday());
    const body = await renderExport(ctx, report as ExportId, filters);
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${csvFilename(report, companyToday())}"`,
      },
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return Response.json({ error: "Sign in required." }, { status: 401 });
    return Response.json({ error: "Export failed." }, { status: 500 });
  }
}

async function renderExport(
  ctx: Awaited<ReturnType<typeof getActionAuthContext>>,
  report: ExportId,
  filters: ReturnType<typeof parseReportFilters>,
): Promise<string> {
  if (report === "progress" || report === "overdue") {
    const [portfolio, issues] = await Promise.all([loadVisiblePortfolio(ctx), loadVisibleIssueFacts(ctx)]);
    const projects = filters.projectKey ? portfolio.filter((project) => project.key === filters.projectKey) : portfolio;
    if (report === "progress") {
      return toCsv(
        ["project", "projectKey", "health", "progress", "open", "done", "overdue", "highest", "target", "lead"],
        projects.map((project) => [
          project.name,
          project.key,
          project.health ? PROJECT_HEALTH_LABELS[project.health] : "Not set",
          project.progress.percent,
          project.openExecutable,
          project.doneExecutable,
          project.overdue,
          project.highestOpen,
          project.targetDay,
          project.lead?.name ?? "",
        ]),
      );
    }
    const projectIds = new Set(projects.map((project) => project.id));
    const rows = overdueRows(
      issues.filter((issue) => projectIds.has(issue.projectId)),
      portfolio,
      getEnv().COMPANY_TIMEZONE,
    );
    return toCsv(
      ["issue", "title", "project", "assignee", "priority", "status", "due", "overdueDays"],
      rows.map((row) => [row.key, row.title, row.projectKey, row.assigneeName, row.priority, row.status, row.dueDate, row.overdueDays]),
    );
  }

  if (report === "activity") {
    const portfolio = await loadVisiblePortfolio(ctx);
    const project = filters.projectKey ? portfolio.find((item) => item.key === filters.projectKey) : undefined;
    if (filters.projectKey && !project) return toCsv(["actor", "action", "project", "issue", "when", "detail"], []);
    const page = await listScopedActivity(ctx, {
      projectId: project?.id,
      actorId: filters.actorId ?? undefined,
      action: filters.action ?? undefined,
      issueType: filters.issueType ?? undefined,
      from: filters.from,
      to: filters.to,
      take: 1000,
    });
    return toCsv(
      ["actor", "action", "project", "issue", "when", "detail"],
      page.rows.map((row) => [
        row.actorName,
        activityActionLabel(row.action),
        row.project?.key ?? "",
        row.issue?.key ?? "",
        row.occurredAt.toISOString(),
        activityChangeDetail(row) ?? describeActivity(row),
      ]),
    );
  }

  const evidence = await listVisibleCompletionEvidence(ctx, filters, 1000);
  return toCsv(
    ["completedBy", "issue", "title", "project", "when"],
    evidence.map((row) => [row.actorName, row.issueKey, row.issueTitle, row.projectKey, row.occurredAt.toISOString()]),
  );
}
