import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { listIssueCompletions } from "@/modules/reporting/contribution.queries";
import { getVisibleIssueByNumber, listProjectIssueTree } from "@/modules/issues/issue.queries";
import { issueKey } from "@/modules/issues/issue.keys";
import {
  addAcceptanceCriterion,
  archiveIssue,
  assignIssue,
  changePriority,
  changeStatus,
  createIssue,
  reparentIssue,
  restoreIssue,
  setDueDate,
  setIssueLabels,
  setStoryFields,
} from "@/modules/issues/issue.service";
import { createProject } from "@/modules/projects/project.service";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { authContextFor, emails, resetDevelopmentSeed, testDb } from "./helpers";

beforeAll(async () => {
  await resetDevelopmentSeed();
});

afterAll(async () => {
  await testDb.$disconnect();
});

async function aquaId() {
  const lead = await authContextFor(emails.lead);
  const aqua = await getVisibleProjectByKey(lead, "AQUA");
  if (!aqua) throw new Error("AQUA missing");
  return { lead, aqua };
}

describe("development seed issues", () => {
  test("creates a legal AquaDesk hierarchy with flat keys", async () => {
    const { lead, aqua } = await aquaId();
    const { tree } = await listProjectIssueTree(lead, aqua.id);
    expect(tree.length).toBeGreaterThan(0);
    expect(tree.every((epic) => epic.type === "EPIC")).toBe(true);
    expect(tree[0]?.key).toMatch(/^AQUA-\d+$/);
    expect(tree.some((epic) => epic.children.some((story) => story.type === "USER_STORY"))).toBe(true);
    const issueCount = await testDb.issue.count({ where: { projectId: aqua.id } });
    expect(issueCount).toBeGreaterThan(8);
  });
});

describe("hierarchy", () => {
  test("creates Epic → Story → Task → Sub-task and rejects illegal parents", async () => {
    const admin = await authContextFor(emails.admin);
    const leadUser = await testDb.user.findUniqueOrThrow({ where: { email: emails.lead } });
    const key = `H${Date.now().toString(36).slice(-7).toUpperCase()}`;
    const project = await createProject(admin, { key, name: "Hierarchy Lab", leadUserId: leadUser.id });
    const lead = await authContextFor(emails.lead);

    const epic = await createIssue(lead, { projectId: project.id, type: "EPIC", title: "Delivery epic" });
    expect(epic.key).toBe(`${key}-1`);

    await expect(createIssue(lead, { projectId: project.id, type: "TASK", title: "Orphan task" })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      createIssue(lead, { projectId: project.id, type: "TASK", parentId: epic.id, title: "Task under epic" }),
    ).rejects.toBeInstanceOf(ValidationError);

    const story = await createIssue(lead, {
      projectId: project.id,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Legal story",
      story: { asA: "member", iWant: "to file work", soThat: "it stays hierarchical" },
    });
    await expect(
      createIssue(lead, { projectId: project.id, type: "SUB_TASK", parentId: story.id, title: "Sub under story" }),
    ).rejects.toBeInstanceOf(ValidationError);

    const task = await createIssue(lead, {
      projectId: project.id,
      type: "TASK",
      parentId: story.id,
      title: "Legal task",
    });
    const sub = await createIssue(lead, {
      projectId: project.id,
      type: "SUB_TASK",
      parentId: task.id,
      title: "Legal sub-task",
    });
    expect(sub.key).toBe(`${key}-4`);

    await expect(
      createIssue(lead, { projectId: project.id, type: "TASK", parentId: sub.id, title: "Child of sub-task" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("rejects a cross-project parent and a cycle", async () => {
    const { lead, aqua } = await aquaId();
    const sv = await getVisibleProjectByKey(lead, "SV");
    if (!sv) throw new Error("SV missing");
    const aquaEpic = await testDb.issue.findFirstOrThrow({ where: { projectId: aqua.id, type: "EPIC" } });
    const svEpic = await testDb.issue.findFirstOrThrow({ where: { projectId: sv.id, type: "EPIC" } });

    await expect(
      createIssue(lead, {
        projectId: aqua.id,
        type: "USER_STORY",
        parentId: svEpic.id,
        title: "Cross project",
        story: { asA: "x", iWant: "y", soThat: "z" },
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    const story = await testDb.issue.findFirstOrThrow({
      where: { projectId: aqua.id, type: "USER_STORY", parentId: aquaEpic.id },
    });
    await expect(reparentIssue(lead, aquaEpic.id, story.id)).rejects.toBeInstanceOf(ValidationError);
  });

  test("keeps keys stable after a legal re-parent", async () => {
    const { lead, aqua } = await aquaId();
    const epic = await createIssue(lead, { projectId: aqua.id, type: "EPIC", title: "Reparent epic" });
    const storyA = await createIssue(lead, {
      projectId: aqua.id,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Story A",
      story: { asA: "lead", iWant: "to move work", soThat: "keys stay put" },
    });
    const storyB = await createIssue(lead, {
      projectId: aqua.id,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Story B",
      story: { asA: "lead", iWant: "a second parent", soThat: "reparenting is legal" },
    });
    const task = await createIssue(lead, {
      projectId: aqua.id,
      type: "TASK",
      parentId: storyA.id,
      title: "Movable task",
    });
    const keyBefore = task.key;
    await reparentIssue(lead, task.id, storyB.id);
    const stored = await testDb.issue.findUniqueOrThrow({ where: { id: task.id } });
    expect(issueKey("AQUA", stored.number)).toBe(keyBefore);
    expect(stored.parentId).toBe(storyB.id);
  });
});

describe("concurrency", () => {
  test("parallel creates do not share a project-local number", async () => {
    const admin = await authContextFor(emails.admin);
    const leadUser = await testDb.user.findUniqueOrThrow({ where: { email: emails.lead } });
    const key = `C${Date.now().toString(36).slice(-7).toUpperCase()}`;
    const project = await createProject(admin, { key, name: "Concurrency Lab", leadUserId: leadUser.id });
    const lead = await authContextFor(emails.lead);

    const created = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        createIssue(lead, { projectId: project.id, type: "EPIC", title: `Parallel ${index}` }),
      ),
    );
    const numbers = created.map((row) => row.number).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(12);
    expect(numbers).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
  });
});

describe("authorization", () => {
  test("a member cannot mutate another project's work", async () => {
    const designer = await authContextFor(emails.designer);
    const aib = await testDb.project.findFirstOrThrow({
      where: { key: "AIB" },
      select: { id: true },
    });
    await expect(createIssue(designer, { projectId: aib.id, type: "EPIC", title: "No" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await getVisibleIssueByNumber(designer, "AIB", 1)).toBeNull();
  });

  test("an Executive can read AquaDesk issues but cannot write without membership", async () => {
    const executive = await authContextFor(emails.executive);
    const issue = await getVisibleIssueByNumber(executive, "AQUA", 1);
    expect(issue).toBeTruthy();
    expect(issue?.canMutate).toBe(false);
    await expect(
      createIssue(executive, { projectId: issue!.project.id, type: "EPIC", title: "Executive write" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("an Admin without membership cannot read issue content", async () => {
    const admin = await authContextFor(emails.admin);
    expect(await getVisibleIssueByNumber(admin, "AQUA", 1)).toBeNull();
  });

  test("rejects an assignee who is not a project member", async () => {
    const { lead, aqua } = await aquaId();
    const adminUser = await testDb.user.findUniqueOrThrow({ where: { email: emails.admin } });
    const epic = await createIssue(lead, { projectId: aqua.id, type: "EPIC", title: "Assign lab" });
    await expect(assignIssue(lead, epic.id, adminUser.id)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("field persistence and activity", () => {
  test("status, priority, due date, story fields, criteria and labels persist with activity", async () => {
    const { lead, aqua } = await aquaId();
    const epic = await createIssue(lead, { projectId: aqua.id, type: "EPIC", title: "Persistence epic" });
    const story = await createIssue(lead, {
      projectId: aqua.id,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Persistence story",
      story: { asA: "qa engineer", iWant: "fields to persist", soThat: "reload shows the same data" },
    });

    await changeStatus(lead, story.id, "IN_PROGRESS");
    await changePriority(lead, story.id, "HIGH");
    await setDueDate(lead, story.id, "2026-12-01");
    await setStoryFields(lead, {
      issueId: story.id,
      asA: "qa engineer",
      iWant: "structured story fields",
      soThat: "they are not a blob",
    });
    const criterion = await addAcceptanceCriterion(lead, { issueId: story.id, text: "Reload shows the criterion." });
    await setIssueLabels(lead, { issueId: story.id, labels: ["qa", "persistence"] });

    const loaded = await getVisibleIssueByNumber(lead, "AQUA", story.number);
    expect(loaded?.status).toBe("IN_PROGRESS");
    expect(loaded?.priority).toBe("HIGH");
    expect(loaded?.dueDate?.toISOString().startsWith("2026-12-01")).toBe(true);
    expect(loaded?.story).toEqual({
      asA: "qa engineer",
      iWant: "structured story fields",
      soThat: "they are not a blob",
    });
    expect(loaded?.acceptanceCriteria.some((row) => row.id === criterion.id)).toBe(true);
    expect(loaded?.labels.map((row) => row.name).sort()).toEqual(["persistence", "qa"]);

    const events = await testDb.activityEvent.findMany({ where: { issueId: story.id }, orderBy: { occurredAt: "asc" } });
    expect(events.some((event) => event.action === "issue.created")).toBe(true);
    expect(events.some((event) => event.action === "issue.updated")).toBe(true);
    const statusEvent = events.find((event) => event.action === "issue.updated" && field(event.after, "status"));
    expect(statusEvent?.before).toMatchObject({ status: "TO_DO" });
    expect(statusEvent?.after).toMatchObject({ status: "IN_PROGRESS" });
    expect(events.some((event) => event.action === "issue.criterion_added")).toBe(true);
    expect(events.some((event) => event.action === "issue.story_updated")).toBe(true);
    expect(events.some((event) => event.action === "issue.labels_changed")).toBe(true);
  });

  test("completion stays with the actor after a later reassignment", async () => {
    const { lead, aqua } = await aquaId();
    const alex = await authContextFor(emails.member);
    const epic = await createIssue(lead, { projectId: aqua.id, type: "EPIC", title: "Completion epic" });
    const story = await createIssue(lead, {
      projectId: aqua.id,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Completion story",
      story: { asA: "lead", iWant: "credit to stick", soThat: "reassignment does not steal it" },
    });
    const task = await createIssue(lead, {
      projectId: aqua.id,
      type: "TASK",
      parentId: story.id,
      title: "Finish this",
      assigneeId: lead.userId,
    });

    await changeStatus(lead, task.id, "DONE");
    await assignIssue(lead, task.id, alex.userId);

    const stored = await testDb.issue.findUniqueOrThrow({ where: { id: task.id } });
    expect(stored.assigneeId).toBe(alex.userId);
    expect(stored.completedById).toBe(lead.userId);

    const completions = await listIssueCompletions(lead, { projectId: aqua.id });
    expect(completions.some((row) => row.issueId === task.id && row.actorUserId === lead.userId)).toBe(true);
    expect(completions.some((row) => row.issueId === task.id && row.actorUserId === alex.userId)).toBe(false);
  });
});

describe("progress and archive", () => {
  test("progress counts executable work without double-counting tasks that have sub-tasks", async () => {
    const { lead, aqua } = await aquaId();
    const epic = await createIssue(lead, { projectId: aqua.id, type: "EPIC", title: "Progress epic" });
    const story = await createIssue(lead, {
      projectId: aqua.id,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Progress story",
      story: { asA: "lead", iWant: "honest progress", soThat: "we do not double-count" },
    });
    const leaf = await createIssue(lead, { projectId: aqua.id, type: "TASK", parentId: story.id, title: "Leaf task" });
    const parentTask = await createIssue(lead, {
      projectId: aqua.id,
      type: "TASK",
      parentId: story.id,
      title: "Parent task",
    });
    const subA = await createIssue(lead, {
      projectId: aqua.id,
      type: "SUB_TASK",
      parentId: parentTask.id,
      title: "Sub A",
    });
    await createIssue(lead, { projectId: aqua.id, type: "SUB_TASK", parentId: parentTask.id, title: "Sub B" });
    await changeStatus(lead, leaf.id, "DONE");
    await changeStatus(lead, parentTask.id, "DONE");
    await changeStatus(lead, subA.id, "DONE");

    const detail = await getVisibleIssueByNumber(lead, "AQUA", story.number);
    expect(detail?.progress).toEqual({ done: 2, total: 3, percent: 67 });
  });

  test("archiving keeps history and does not reuse numbers", async () => {
    const { lead, aqua } = await aquaId();
    const epic = await createIssue(lead, { projectId: aqua.id, type: "EPIC", title: "Archive me" });
    const number = epic.number;
    await archiveIssue(lead, { issueId: epic.id });
    const archived = await testDb.issue.findUniqueOrThrow({ where: { id: epic.id } });
    expect(archived.archivedAt).toBeTruthy();
    const events = await testDb.activityEvent.findMany({ where: { issueId: epic.id } });
    expect(events.some((event) => event.action === "issue.created")).toBe(true);
    expect(events.some((event) => event.action === "issue.archived")).toBe(true);

    const next = await createIssue(lead, { projectId: aqua.id, type: "EPIC", title: "After archive" });
    expect(next.number).toBeGreaterThan(number);
    await restoreIssue(lead, { issueId: epic.id });
    const restored = await testDb.issue.findUniqueOrThrow({ where: { id: epic.id } });
    expect(restored.archivedAt).toBeNull();
    expect(restored.number).toBe(number);
  });
});

function field(value: unknown, key: string): unknown {
  return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : undefined;
}
