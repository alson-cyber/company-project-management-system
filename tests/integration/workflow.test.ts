import { beforeAll, describe, expect, test } from "vitest";
import { addComment } from "@/modules/collaboration/collaboration.service";
import {
  countUnread,
  listInbox,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/attention/attention.queries";
import { filterMyWork } from "@/modules/attention/attention.rules";
import { loadMyWork } from "@/modules/attention/my-work.queries";
import { searchWorkspace } from "@/modules/attention/search.queries";
import { changeStatus, createIssue, updateIssue } from "@/modules/issues/issue.service";
import { addCalendarDays, todayInTimeZone } from "@/lib/calendar";
import { getEnv } from "@/server/env";
import { authContextFor, emails, resetDevelopmentSeed, testDb } from "./helpers";

beforeAll(async () => {
  await resetDevelopmentSeed();
});

async function aquaStory() {
  const project = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { id: true } });
  const story = await testDb.issue.findFirstOrThrow({
    where: { projectId: project.id, title: "Let guests cancel within policy" },
    select: { id: true },
  });
  return { projectId: project.id, storyId: story.id };
}

describe("daily workflow", () => {
  test("my work is limited to accessible assigned work", async () => {
    const alex = await authContextFor(emails.member);
    const emma = await authContextFor("emma.davis@workhub.test");
    const omar = await authContextFor(emails.admin);
    const signveli = await testDb.project.findFirstOrThrow({ where: { key: "SV" }, select: { id: true } });
    const epic = await createIssue(alex, { projectId: signveli.id, type: "EPIC", title: "Hidden signature vault" });
    const story = await createIssue(alex, {
      projectId: signveli.id,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Sign a private packet",
      story: { asA: "customer", iWant: "to sign privately", soThat: "the packet stays hidden" },
    });
    const task = await createIssue(alex, {
      projectId: signveli.id,
      type: "TASK",
      parentId: story.id,
      title: "Private signature vault task",
      assigneeId: alex.userId,
    });

    const alexWork = await loadMyWork(alex);
    const emmaWork = await loadMyWork(emma);
    const omarWork = await loadMyWork(omar);
    expect(alexWork.some((issue) => issue.id === task.id)).toBe(true);
    expect(emmaWork.some((issue) => issue.id === task.id)).toBe(false);
    expect(omarWork.some((issue) => issue.projectKey === "AQUA" || issue.projectKey === "SV")).toBe(false);
  });

  test("in progress, in review, overdue and due soon follow the shared rules", async () => {
    const sarah = await authContextFor(emails.lead);
    const alex = await authContextFor(emails.member);
    const { projectId, storyId } = await aquaStory();
    const zone = getEnv().COMPANY_TIMEZONE;
    const today = todayInTimeZone(zone);
    const created = await createIssue(sarah, {
      projectId,
      type: "TASK",
      parentId: storyId,
      title: "Workflow due states",
      assigneeId: alex.userId,
      dueDate: addCalendarDays(today, 3),
    });
    await changeStatus(sarah, created.id, "IN_PROGRESS");
    const open = await loadMyWork(alex);
    expect(filterMyWork(open, alex.userId, { view: "progress", projectId: "", status: "", type: "", priority: "", due: "", sort: "due" }, zone).some((issue) => issue.id === created.id)).toBe(true);
    expect(filterMyWork(open, alex.userId, { view: "review", projectId: "", status: "", type: "", priority: "", due: "", sort: "due" }, zone).some((issue) => issue.id === created.id)).toBe(false);
    expect(filterMyWork(open, alex.userId, { view: "soon", projectId: "", status: "", type: "", priority: "", due: "", sort: "due" }, zone).some((issue) => issue.id === created.id)).toBe(true);

    await updateIssue(sarah, { issueId: created.id, dueDate: "2020-01-01", status: "IN_REVIEW" });
    const reviewed = await loadMyWork(alex);
    expect(filterMyWork(reviewed, alex.userId, { view: "review", projectId: "", status: "", type: "", priority: "", due: "", sort: "due" }, zone).some((issue) => issue.id === created.id)).toBe(true);
    expect(filterMyWork(reviewed, alex.userId, { view: "overdue", projectId: "", status: "", type: "", priority: "", due: "", sort: "due" }, zone).some((issue) => issue.id === created.id)).toBe(true);
    expect(filterMyWork(reviewed, alex.userId, { view: "soon", projectId: "", status: "", type: "", priority: "", due: "", sort: "due" }, zone).some((issue) => issue.id === created.id)).toBe(false);
  });

  test("completed recently stays with the person who completed the work", async () => {
    const sarah = await authContextFor(emails.lead);
    const alex = await authContextFor(emails.member);
    const mika = await authContextFor(emails.designer);
    const { projectId, storyId } = await aquaStory();
    const created = await createIssue(sarah, {
      projectId,
      type: "TASK",
      parentId: storyId,
      title: "Workflow completion credit",
      assigneeId: mika.userId,
    });
    await changeStatus(mika, created.id, "DONE");
    await updateIssue(sarah, { issueId: created.id, assigneeId: alex.userId });
    const zone = getEnv().COMPANY_TIMEZONE;
    const query = { view: "completed" as const, projectId: "", status: "", type: "", priority: "", due: "" as const, sort: "due" as const };
    expect(filterMyWork(await loadMyWork(mika), mika.userId, query, zone).some((issue) => issue.id === created.id)).toBe(true);
    expect(filterMyWork(await loadMyWork(alex), alex.userId, query, zone).some((issue) => issue.id === created.id)).toBe(false);
  });

  test("assignment and comments create inbox items; priority edits do not", async () => {
    const sarah = await authContextFor(emails.lead);
    const emma = await authContextFor("emma.davis@workhub.test");
    const { projectId, storyId } = await aquaStory();
    const created = await createIssue(sarah, {
      projectId,
      type: "TASK",
      parentId: storyId,
      title: "Workflow inbox target",
      assigneeId: emma.userId,
    });
    const assigned = await testDb.notification.findMany({
      where: { recipientId: emma.userId, issueId: created.id, type: "ISSUE_ASSIGNED" },
    });
    expect(assigned).toHaveLength(1);
    expect(await testDb.notification.count({ where: { recipientId: sarah.userId, issueId: created.id } })).toBe(0);

    await updateIssue(sarah, { issueId: created.id, assigneeId: emma.userId });
    expect(await testDb.notification.count({ where: { recipientId: emma.userId, issueId: created.id, type: "ISSUE_ASSIGNED" } })).toBe(1);

    const beforePriority = await testDb.notification.count({ where: { recipientId: emma.userId, issueId: created.id } });
    await updateIssue(sarah, { issueId: created.id, priority: "LOW" });
    expect(await testDb.notification.count({ where: { recipientId: emma.userId, issueId: created.id } })).toBe(beforePriority);

    await addComment(sarah, { issueId: created.id, body: "Please confirm the cancellation window." });
    const comments = await testDb.notification.findMany({
      where: { recipientId: emma.userId, issueId: created.id, type: "ISSUE_COMMENTED" },
    });
    expect(comments).toHaveLength(1);

    await changeStatus(sarah, created.id, "IN_REVIEW");
    const status = await testDb.notification.findFirstOrThrow({
      where: { recipientId: emma.userId, issueId: created.id, type: "ISSUE_STATUS_CHANGED" },
    });
    expect(status.metadata).toMatchObject({ fromStatus: "TO_DO", toStatus: "IN_REVIEW" });
  });

  test("read state does not rewrite activity", async () => {
    const sarah = await authContextFor(emails.lead);
    const emma = await authContextFor("emma.davis@workhub.test");
    const { projectId, storyId } = await aquaStory();
    const created = await createIssue(sarah, {
      projectId,
      type: "TASK",
      parentId: storyId,
      title: "Workflow read state",
      assigneeId: emma.userId,
    });
    await addComment(sarah, { issueId: created.id, body: "Read-state comment." });
    const activityBefore = await testDb.activityEvent.count();
    const inbox = await listInbox(emma);
    const target = inbox.find((item) => item.sentence.includes("commented") && item.issueTitle === "Workflow read state");
    expect(target).toBeTruthy();
    await markNotificationRead(emma, target!.id);
    const stored = await testDb.notification.findUniqueOrThrow({ where: { id: target!.id } });
    expect(stored.readAt).toBeTruthy();
    expect(await testDb.activityEvent.count()).toBe(activityBefore);

    const unreadBefore = await countUnread(emma);
    expect(unreadBefore).toBeGreaterThan(0);
    await markAllNotificationsRead(emma);
    expect(await countUnread(emma)).toBe(0);
    expect(await testDb.activityEvent.count()).toBe(activityBefore);
  });

  test("search respects project visibility and admin boundaries", async () => {
    const alex = await authContextFor(emails.member);
    const emma = await authContextFor("emma.davis@workhub.test");
    const omar = await authContextFor(emails.admin);
    const alson = await authContextFor(emails.executive);

    const memberHit = await searchWorkspace(alex, "AQUA-6");
    expect(memberHit.issues.some((issue) => issue.key === "AQUA-6")).toBe(true);
    expect((await searchWorkspace(alex, "AquaDesk")).projects.some((project) => project.key === "AQUA")).toBe(true);
    expect((await searchWorkspace(alex, "Sarah Kim")).people.some((person) => person.name === "Sarah Kim")).toBe(true);
    expect((await searchWorkspace(alex, "Sarah Kim")).people.every((person) => person.email === null)).toBe(true);

    const signveli = await testDb.project.findFirstOrThrow({ where: { key: "SV" }, select: { id: true } });
    const epic = await createIssue(alex, { projectId: signveli.id, type: "EPIC", title: "Search boundary epic" });
    const story = await createIssue(alex, {
      projectId: signveli.id,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Search boundary story",
      story: { asA: "customer", iWant: "a private result", soThat: "search stays scoped" },
    });
    await createIssue(alex, {
      projectId: signveli.id,
      type: "TASK",
      parentId: story.id,
      title: "Search boundary task",
      assigneeId: alex.userId,
    });
    const hidden = await searchWorkspace(emma, "Search boundary task");
    expect(hidden.issues).toEqual([]);
    expect((await searchWorkspace(alex, "Search boundary task")).issues.some((issue) => issue.title === "Search boundary task")).toBe(true);
    const adminHidden = await searchWorkspace(omar, "AQUA-6");
    expect(adminHidden.issues).toEqual([]);
    expect(adminHidden.projects).toEqual([]);
    const executiveHit = await searchWorkspace(alson, "AQUA-6");
    expect(executiveHit.issues.some((issue) => issue.key === "AQUA-6")).toBe(true);
    const adminEmail = await searchWorkspace(omar, "sarah.kim@workhub.test");
    expect(adminEmail.people.some((person) => person.email === "sarah.kim@workhub.test")).toBe(true);
  });
});
