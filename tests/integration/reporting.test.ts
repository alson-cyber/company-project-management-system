import { describe, expect, test } from "vitest";
import { ForbiddenError } from "@/server/errors";
import { isOverdue } from "@/lib/calendar";
import { progressOfProject } from "@/modules/issues/issue.progress";
import { listScopedActivity } from "@/modules/activity/activity.queries";
import { loadExecutivePortfolio, loadVisibleIssueFacts, loadVisiblePortfolio } from "@/modules/reporting/portfolio.queries";
import { applyIssueFilters, executableFacts, overdueRows, statusCounts } from "@/modules/reporting/report.derive";
import { parseReportFilters } from "@/modules/reporting/reports.model";
import { listVisibleCompletionEvidence } from "@/modules/reporting/trend.queries";
import { toCsv } from "@/modules/reporting/csv";
import { getEnv } from "@/server/env";
import { authContextFor, emails, testDb } from "./helpers";

const at = new Date("2026-10-17T08:00:00.000Z");

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
    const executable = executableFacts(aquaIssues);
    const overdue = executable.filter(
      (issue) => issue.dueDate && isOverdue(new Date(`${issue.dueDate}T00:00:00.000Z`), issue.status, getEnv().COMPANY_TIMEZONE, at),
    );
    expect(aqua?.overdue).toBe(overdue.length);
    expect(overdueRows(aquaIssues, portfolio, getEnv().COMPANY_TIMEZONE, at)).toHaveLength(overdue.length);
    expect(aqua?.highestOpen).toBe(executable.filter((issue) => issue.status !== "DONE" && issue.priority === "HIGHEST").length);
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
    const executive = await authContextFor(emails.executive);
    const filters = parseReportFilters({ range: "90" }, "2026-10-17");
    const before = await listVisibleCompletionEvidence(executive, filters, 50);
    const credited = before.find((row) => row.actorUserId);
    expect(credited?.actorUserId).toBeTruthy();
    const issue = await testDb.issue.findFirstOrThrow({
      where: { project: { key: credited?.projectKey }, number: Number(credited?.issueKey.split("-").at(-1)) },
      select: { id: true, assigneeId: true },
    });
    const other = await testDb.user.findFirstOrThrow({
      where: { id: { not: issue.assigneeId ?? "00000000-0000-4000-8000-000000000000" }, status: "ACTIVE" },
      select: { id: true },
    });
    await testDb.issue.update({ where: { id: issue.id }, data: { assigneeId: other.id } });
    try {
      const after = await listVisibleCompletionEvidence(executive, filters, 50);
      expect(after.find((row) => row.issueKey === credited?.issueKey)?.actorUserId).toBe(credited?.actorUserId);
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
