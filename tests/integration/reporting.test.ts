import { describe, expect, test } from "vitest";
import { ForbiddenError } from "@/server/errors";
import { isOverdue } from "@/lib/calendar";
import { progressOfProject } from "@/modules/issues/issue.progress";
import { listScopedActivity } from "@/modules/activity/activity.queries";
import { loadExecutivePortfolio, loadVisibleIssueFacts, loadVisiblePortfolio } from "@/modules/reporting/portfolio.queries";
import { applyIssueFilters, overdueRows, statusCounts } from "@/modules/reporting/report.derive";
import { parseReportFilters } from "@/modules/reporting/reports.model";
import { companyToday, completionTrend, listVisibleCompletionEvidence } from "@/modules/reporting/trend.queries";
import { toCsv } from "@/modules/reporting/csv";
import { getEnv } from "@/server/env";
import { authContextFor, emails, testDb } from "./helpers";

const at = new Date("2026-10-17T08:00:00.000Z");

async function seededCompletionFixture() {
  const executive = await authContextFor(emails.executive);
  const event = await testDb.activityEvent.findFirstOrThrow({
    where: {
      workspaceId: executive.workspace.id,
      action: "issue.completed",
      project: { key: "AQUA" },
      metadata: { path: ["source"], equals: "development-seed" },
    },
    orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
    select: {
      actorUserId: true,
      occurredAt: true,
      issue: { select: { id: true, number: true, type: true, assigneeId: true } },
      project: { select: { id: true, key: true } },
    },
  });
  if (!event.issue || !event.project || !event.actorUserId) {
    throw new Error("The seeded completion must have an issue, project and credited actor.");
  }
  // Seed events use their insertion date. Anchor to the fixture, not a fixed day
  // or today's date, so a reused database remains valid after the seed ages.
  const filters = parseReportFilters(
    { range: "90", project: event.project.key },
    companyToday(event.occurredAt),
  );
  return { executive, event, issue: event.issue, project: event.project, filters };
}

describe("executive reporting", () => {
  test("an executive can read the company portfolio, and health stays the stored label", async () => {
    const executive = await authContextFor(emails.executive);
    const before = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { health: true } });
    const portfolio = await loadExecutivePortfolio(executive, at);
    const after = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { health: true } });
    expect(portfolio.map((project) => project.key)).toEqual(expect.arrayContaining(["AQUA", "SV", "AIB", "PMS"]));
    const aqua = portfolio.find((project) => project.key === "AQUA");
    expect(aqua?.health).toBe(before.health);
    expect(after.health).toBe(before.health);
    if (aqua?.health === "AT_RISK" || aqua?.health === "BLOCKED") {
      expect(aqua.signals.some((signal) => signal.kind === "at_risk" || signal.kind === "blocked")).toBe(true);
    }
  });

  test("a member, a project lead and an admin cannot open the executive portfolio", async () => {
    const member = await authContextFor(emails.member);
    const lead = await authContextFor(emails.lead);
    const admin = await authContextFor(emails.admin);
    await expect(loadExecutivePortfolio(member, at)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(loadExecutivePortfolio(lead, at)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(loadExecutivePortfolio(admin, at)).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("portfolio progress and overdue counts use the established rules", async () => {
    const executive = await authContextFor(emails.executive);
    const portfolio = await loadExecutivePortfolio(executive, at);
    const issues = await loadVisibleIssueFacts(executive);
    const aqua = portfolio.find((project) => project.key === "AQUA");
    expect(aqua).toBeTruthy();
    const aquaIssues = issues.filter((issue) => issue.projectId === aqua?.id);
    const progress = progressOfProject(aquaIssues.map((issue) => ({ ...issue, archivedAt: null })));
    expect(aqua?.progress).toEqual(progress);
    const overdue = aquaIssues.filter(
      (issue) =>
        issue.status !== "DONE" &&
        issue.dueDate &&
        isOverdue(new Date(`${issue.dueDate}T00:00:00.000Z`), issue.status, getEnv().COMPANY_TIMEZONE, at),
    );
    expect(aqua?.overdue).toBe(overdue.length);
    expect(overdueRows(aquaIssues, portfolio, getEnv().COMPANY_TIMEZONE, at)).toHaveLength(overdue.length);
    expect(aqua?.highestOpen).toBe(aquaIssues.filter((issue) => issue.status !== "DONE" && issue.priority === "HIGHEST").length);
    expect(aqua?.signals.every((signal) => signal.text.length > 0)).toBe(true);
  });

  test("reports stay inside the projects a person can see", async () => {
    const emma = await authContextFor("emma.davis@workhub.test");
    const executive = await authContextFor(emails.executive);
    const admin = await authContextFor(emails.admin);
    const emmaPortfolio = await loadVisiblePortfolio(emma, at);
    const company = await loadVisiblePortfolio(executive, at);
    const adminPortfolio = await loadVisiblePortfolio(admin, at);
    expect(emmaPortfolio.map((project) => project.key).sort()).toEqual(["AIB", "AQUA", "PMS"]);
    expect(company.map((project) => project.key)).toContain("SV");
    expect(adminPortfolio).toEqual([]);
    const emmaIssues = await loadVisibleIssueFacts(emma);
    expect(overdueRows(emmaIssues, emmaPortfolio, getEnv().COMPANY_TIMEZONE, at).some((row) => row.projectKey === "SV")).toBe(false);
    const filters = parseReportFilters({ project: "AQUA", status: "IN_REVIEW" }, "2026-10-17");
    const counts = statusCounts(applyIssueFilters(emmaIssues, emmaPortfolio, filters));
    expect(counts.TO_DO + counts.IN_PROGRESS + counts.DONE).toBe(0);
  });

  test("master activity filters by project, actor and date, and stays paged", async () => {
    const executive = await authContextFor(emails.executive);
    const portfolio = await loadVisiblePortfolio(executive, at);
    const aqua = portfolio.find((project) => project.key === "AQUA");
    const sarah = await testDb.user.findUniqueOrThrow({ where: { email: emails.lead }, select: { id: true } });
    const byProject = await listScopedActivity(executive, { projectId: aqua?.id, take: 20 });
    expect(byProject.rows.length).toBeGreaterThan(0);
    expect(byProject.rows.every((row) => row.project?.key === "AQUA")).toBe(true);
    const byActor = await listScopedActivity(executive, { actorId: sarah.id, take: 20 });
    expect(byActor.rows.every((row) => row.actorId === sarah.id)).toBe(true);
    const future = await listScopedActivity(executive, { from: "2099-01-01", to: "2099-01-02", take: 20 });
    expect(future.rows).toEqual([]);
    const first = await listScopedActivity(executive, { take: 2 });
    expect(first.rows).toHaveLength(2);
    expect(first.nextCursor).toBeTruthy();
    const second = await listScopedActivity(executive, { take: 2, cursor: first.nextCursor ?? undefined });
    expect(second.rows).toHaveLength(2);
    const firstIds = new Set(first.rows.map((row) => row.id));
    expect(second.rows.some((row) => firstIds.has(row.id))).toBe(false);
  });

  test("completion credit stays with the person who completed the work", async () => {
    const { executive, event, issue, project, filters } = await seededCompletionFixture();
    const key = `${project.key}-${issue.number}`;
    const before = await listVisibleCompletionEvidence(executive, filters, 50);
    const credited = before.find((row) => row.issueKey === key);
    expect(credited?.actorUserId).toBeTruthy();
    expect(credited?.actorUserId).toBe(event.actorUserId);
    const other = await testDb.user.findFirstOrThrow({
      where: {
        id: { notIn: [issue.assigneeId, event.actorUserId].filter((id): id is string => id !== null) },
        status: "ACTIVE",
        projectMemberships: { some: { projectId: project.id } },
      },
      select: { id: true },
    });
    await testDb.issue.update({ where: { id: issue.id }, data: { assigneeId: other.id } });
    try {
      const after = await listVisibleCompletionEvidence(executive, filters, 50);
      expect(after.find((row) => row.issueKey === key)).toMatchObject({
        actorUserId: event.actorUserId,
        assigneeAtCompletion: credited?.assigneeAtCompletion,
      });
      const stored = await testDb.issue.findUniqueOrThrow({ where: { id: issue.id } });
      expect(stored.assigneeId).toBe(other.id);
      expect(stored.completedById).toBe(event.actorUserId);
    } finally {
      await testDb.issue.update({ where: { id: issue.id }, data: { assigneeId: issue.assigneeId } });
    }
  });

  test("a person view lists their current open work", async () => {
    const executive = await authContextFor(emails.executive);
    const alex = await testDb.user.findUniqueOrThrow({ where: { email: emails.member }, select: { id: true } });
    const issues = await loadVisibleIssueFacts(executive);
    const assigned = issues.filter((issue) => issue.assigneeId === alex.id && issue.status !== "DONE");
    expect(assigned.length).toBeGreaterThan(0);
  });

  test("csv export uses stable columns and does not include an invisible project", async () => {
    const emma = await authContextFor("emma.davis@workhub.test");
    const portfolio = await loadVisiblePortfolio(emma, at);
    const csv = toCsv(
      ["project", "projectKey"],
      portfolio.map((project) => [project.name, project.key]),
    );
    expect(csv.startsWith("project,project_key\n")).toBe(true);
    expect(csv).toContain("AquaDesk");
    expect(csv).not.toContain("SignVeli");
  });
});

test.each(["project", "actor", "type", "actor and type"] as const)(
  "completion trend matches evidence with %s filters",
  async (scope) => {
    const { executive, event, issue, project, filters } = await seededCompletionFixture();
    if (scope.includes("actor")) filters.actorId = event.actorUserId;
    if (scope.includes("type")) filters.issueType = issue.type;
    const evidence = await listVisibleCompletionEvidence(executive, filters, 1000);
    const points = await completionTrend(executive, [project.id], filters);
    expect(evidence.length).toBeGreaterThan(0);
    expect(points.reduce((sum, point) => sum + point.count, 0)).toBe(evidence.length);
    for (const point of points) {
      expect(point.count).toBe(evidence.filter((row) => companyToday(row.occurredAt) === point.day).length);
    }
  },
);
