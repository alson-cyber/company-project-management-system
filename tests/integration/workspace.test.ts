import { beforeAll, describe, expect, test } from "vitest";
import { openAttachment } from "@/modules/collaboration/collaboration.service";
import { listFilteredProjectActivity } from "@/modules/activity/activity.queries";
import { changeStatus, createIssue, updateIssue } from "@/modules/issues/issue.service";
import { setProjectHealth, updateProject } from "@/modules/projects/project.service";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import {
  boardCards,
  filterBoardCards,
  groupBoardCards,
  memberFacts,
  overviewSignals,
  timelineMark,
  timelineWindow,
} from "@/modules/projects/workspace.model";
import { listProjectFiles, listProjectWorkspaceIssues } from "@/modules/projects/workspace.queries";
import { calendarDayUtc, todayInTimeZone } from "@/lib/calendar";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { getEnv } from "@/server/env";
import { authContextFor, emails, resetDevelopmentSeed, testDb } from "./helpers";

beforeAll(async () => {
  await resetDevelopmentSeed();
});

async function aqua() {
  const project = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { id: true, status: true, targetDate: true } });
  return project;
}

describe("project workspace", () => {
  test("overview progress and overdue counts come from issue records", async () => {
    const sarah = await authContextFor(emails.lead);
    const project = await aqua();
    const issues = await listProjectWorkspaceIssues(sarah, project.id);
    const signals = overviewSignals(issues, {
      today: "2026-10-15",
      targetDate: project.targetDate ? calendarDayUtc(project.targetDate) : null,
      projectStatus: project.status,
    });
    const availability = issues.find((issue) => issue.title === "Implement availability API");
    expect(availability?.overdue).toBe(true);
    expect(signals.overdue.some((item) => item.key === availability?.key)).toBe(true);
    expect(signals.progress.total).toBeGreaterThan(0);
    expect(signals.progress.percent).toBe(Math.round((signals.progress.done / signals.progress.total) * 100));
    expect(signals.highestOpenCount).toBeGreaterThan(0);
  });

  test("the board lists tasks and sub-tasks once, grouped and filtered", async () => {
    const alex = await authContextFor(emails.member);
    const issues = await listProjectWorkspaceIssues(alex, (await aqua()).id);
    const cards = boardCards(issues);
    expect(cards.every((card) => card.type === "TASK" || card.type === "SUB_TASK")).toBe(true);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    expect(cards.some((card) => card.title === "Guest booking experience")).toBe(false);

    const byStory = groupBoardCards(cards, "story");
    const booking = byStory.find((group) => group.title === "Streamline guest booking flow");
    expect(booking?.cards.filter((card) => card.key === cards.find((item) => item.title === "Implement availability API")?.key)).toHaveLength(1);

    const byEpic = groupBoardCards(cards, "epic");
    expect(byEpic.find((group) => group.title === "Guest booking experience")?.cards.length).toBeGreaterThan(0);
    expect(byEpic.flatMap((group) => group.cards)).toHaveLength(cards.length);

    const highest = filterBoardCards(cards, { assigneeId: "", priority: "HIGHEST", type: "", label: "" });
    expect(highest.map((card) => card.title)).toContain("Implement availability API");
    expect(highest.map((card) => card.title)).not.toContain("QA booking happy path");
  });

  test("moving a task updates status, survives a reload, and writes activity", async () => {
    const sarah = await authContextFor(emails.lead);
    const project = await aqua();
    const story = await testDb.issue.findFirstOrThrow({
      where: { projectId: project.id, title: "Let guests cancel within policy" },
      select: { id: true },
    });
    const created = await createIssue(sarah, {
      projectId: project.id,
      type: "TASK",
      parentId: story.id,
      title: "Workspace status persistence",
    });
    await changeStatus(sarah, created.id, "IN_REVIEW");
    const reloaded = await testDb.issue.findUniqueOrThrow({ where: { id: created.id }, select: { status: true } });
    expect(reloaded.status).toBe("IN_REVIEW");
    const event = await testDb.activityEvent.findFirst({
      where: { issueId: created.id, action: "issue.updated" },
      orderBy: { occurredAt: "desc" },
    });
    expect(event?.after).toMatchObject({ status: "IN_REVIEW" });
    expect(event?.before).toMatchObject({ status: "TO_DO" });

    const executive = await authContextFor(emails.executive);
    await expect(changeStatus(executive, created.id, "DONE")).rejects.toBeInstanceOf(ForbiddenError);
    const admin = await authContextFor(emails.admin);
    await expect(changeStatus(admin, created.id, "DONE")).rejects.toBeInstanceOf(NotFoundError);
    expect((await testDb.issue.findUniqueOrThrow({ where: { id: created.id }, select: { status: true } })).status).toBe("IN_REVIEW");
  });

  test("timeline uses planned dates and rejects an inverted range", async () => {
    const sarah = await authContextFor(emails.lead);
    const project = await aqua();
    const issues = await listProjectWorkspaceIssues(sarah, project.id);
    const availability = issues.find((issue) => issue.title === "Implement availability API");
    expect(availability?.plannedStartDate).toBe("2026-10-01");
    expect(availability?.dueDate).toBe("2026-10-10");
    const today = todayInTimeZone(getEnv().COMPANY_TIMEZONE);
    const window = timelineWindow(
      issues.flatMap((issue) => [issue.plannedStartDate, issue.dueDate].filter((date): date is string => Boolean(date))),
      project.targetDate ? calendarDayUtc(project.targetDate) : null,
      today,
    );
    expect(timelineMark(availability!, window)?.kind).toBe("bar");

    const story = await testDb.issue.findFirstOrThrow({
      where: { projectId: project.id, title: "Let guests cancel within policy" },
      select: { id: true },
    });
    const created = await createIssue(sarah, {
      projectId: project.id,
      type: "TASK",
      parentId: story.id,
      title: "Workspace date range",
      dueDate: "2026-10-10",
    });
    await expect(updateIssue(sarah, { issueId: created.id, plannedStartDate: "2026-10-11" })).rejects.toBeInstanceOf(ValidationError);
  });

  test("project files aggregate issue attachments and stay behind project view", async () => {
    const alex = await authContextFor(emails.member);
    const project = await aqua();
    const files = await listProjectFiles(alex, project.id, "AQUA");
    const flow = files.find((file) => file.filename === "booking-flow.png");
    expect(flow?.issue.title).toBe("Implement availability API");
    expect(flow?.issue.key).toMatch(/^AQUA-\d+$/);
    const admin = await authContextFor(emails.admin);
    await expect(listProjectFiles(admin, project.id, "AQUA")).rejects.toBeInstanceOf(NotFoundError);
    if (flow) await expect(openAttachment(admin, flow.id)).rejects.toBeInstanceOf(NotFoundError);
    if (flow) {
      const opened = await openAttachment(alex, flow.id);
      expect(opened.filename).toBe("booking-flow.png");
    }
  });

  test("team membership and completion stay with the person who finished the work", async () => {
    const sarah = await authContextFor(emails.lead);
    const project = await getVisibleProjectByKey(sarah, "AQUA");
    expect(project?.members.some((member) => member.role === "LEAD" && member.name === "Sarah Kim")).toBe(true);
    expect(project?.members.length).toBeGreaterThan(1);

    const issues = await listProjectWorkspaceIssues(sarah, project!.id);
    const story = await testDb.issue.findFirstOrThrow({
      where: { projectId: project!.id, title: "Let guests cancel within policy" },
      select: { id: true },
    });
    const alex = await authContextFor(emails.member);
    const created = await createIssue(sarah, {
      projectId: project!.id,
      type: "TASK",
      parentId: story.id,
      title: "Workspace completion credit",
    });
    await changeStatus(sarah, created.id, "DONE");
    await updateIssue(sarah, { issueId: created.id, assigneeId: alex.userId });
    const after = await listProjectWorkspaceIssues(sarah, project!.id);
    expect(memberFacts(sarah.userId, after).completed.some((item) => item.id === created.id)).toBe(true);
    expect(memberFacts(alex.userId, after).completed.some((item) => item.id === created.id)).toBe(false);
    expect(issues.length).toBeGreaterThan(0);
  });

  test("activity filters and project settings follow role", async () => {
    const sarah = await authContextFor(emails.lead);
    const project = await aqua();
    const completed = await listFilteredProjectActivity(sarah, project.id, { action: "issue.completed" });
    expect(completed.length).toBeGreaterThan(0);
    expect(completed.every((event) => event.action === "issue.completed")).toBe(true);
    const bySarah = await listFilteredProjectActivity(sarah, project.id, { actorId: sarah.userId, action: "issue.completed" });
    expect(bySarah.every((event) => event.actorId === sarah.userId)).toBe(true);

    const health = await setProjectHealth(sarah, { projectId: project.id, health: "AT_RISK", note: "Availability is overdue." });
    expect(health.changed).toBe(true);
    const renamed = await updateProject(sarah, {
      projectId: project.id,
      name: "AquaDesk",
      description: "Resort excursion and activity booking and operations system.",
      status: "ACTIVE",
      targetDate: "2026-12-15",
    });
    expect(renamed.changed).toBe(false);

    const alex = await authContextFor(emails.member);
    await expect(
      updateProject(alex, {
        projectId: project.id,
        name: "AquaDesk renamed",
        description: "Nope",
        status: "ON_HOLD",
        targetDate: "",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(setProjectHealth(alex, { projectId: project.id, health: "HEALTHY" })).rejects.toBeInstanceOf(ForbiddenError);
    const stored = await testDb.project.findUniqueOrThrow({ where: { id: project.id }, select: { name: true, status: true } });
    expect(stored).toMatchObject({ name: "AquaDesk", status: "ACTIVE" });
  });

  test("a status change is visible to the board, overview, and activity together", async () => {
    const sarah = await authContextFor(emails.lead);
    const project = await aqua();
    const story = await testDb.issue.findFirstOrThrow({
      where: { projectId: project.id, title: "Let guests cancel within policy" },
      select: { id: true },
    });
    const created = await createIssue(sarah, {
      projectId: project.id,
      type: "TASK",
      parentId: story.id,
      title: "Workspace cross view",
      priority: "HIGHEST",
    });
    await changeStatus(sarah, created.id, "DONE");
    const issues = await listProjectWorkspaceIssues(sarah, project.id);
    const card = boardCards(issues).find((item) => item.id === created.id);
    expect(card?.status).toBe("DONE");
    const signals = overviewSignals(issues, { today: "2026-10-15", targetDate: "2026-12-15", projectStatus: "ACTIVE" });
    expect(signals.recentlyCompleted.some((item) => item.id === created.id)).toBe(true);
    expect(signals.highestOpenCount).toBe(signals.highPriorityOpen.filter((item) => item.priority === "HIGHEST").length);
    const activity = await listFilteredProjectActivity(sarah, project.id, { issueNumber: created.number, action: "issue.completed" });
    expect(activity.some((event) => event.issue?.key === created.key)).toBe(true);
  });
});
