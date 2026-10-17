import { beforeAll, describe, expect, test } from "vitest";
import { markAllNotificationsRead, markNotificationRead } from "@/modules/attention/attention.queries";
import { searchWorkspace } from "@/modules/attention/search.queries";
import {
  addAttachment,
  addComment,
  addNote,
  openAttachment,
  removeAttachment,
  updateComment,
  updateNote,
} from "@/modules/collaboration/collaboration.service";
import { assignIssue, changeStatus, createIssue, updateIssue } from "@/modules/issues/issue.service";
import { getVisibleIssueByNumber } from "@/modules/issues/issue.queries";
import { loadExecutivePortfolio, loadVisibleIssueFacts } from "@/modules/reporting/portfolio.queries";
import { parseReportFilters } from "@/modules/reporting/reports.model";
import { listVisibleCompletionEvidence } from "@/modules/reporting/trend.queries";
import { assertWorkspacePermission } from "@/server/access/policy";
import { loadAuthContext } from "@/server/access/load-context";
import { auth } from "@/server/auth/auth";
import { getAttachmentPolicy } from "@/server/config";
import { ForbiddenError, NotFoundError } from "@/server/errors";
import { authContextFor, emails, resetDevelopmentSeed, testDb } from "./helpers";

beforeAll(async () => {
  await resetDevelopmentSeed();
});

async function projectId(key: string) {
  const project = await testDb.project.findFirstOrThrow({ where: { key }, select: { id: true } });
  return project.id;
}

describe("security boundaries", () => {
  test("keeps the automated suites on the isolated test database", async () => {
    const rows = await testDb.$queryRaw<Array<{ current: string }>>`SELECT current_database() AS current`;
    expect(rows[0]?.current).toBe("pms_test");
  });

  test("a member cannot read or change an issue in a project they do not belong to", async () => {
    const alex = await authContextFor(emails.member);
    const emma = await authContextFor(emails.qa);
    const issue = await createIssue(alex, { projectId: await projectId("SV"), type: "EPIC", title: "Member isolation epic" });
    expect(await getVisibleIssueByNumber(emma, "SV", issue.number)).toBeNull();
    await expect(updateIssue(emma, { issueId: issue.id, title: "Taken over" })).rejects.toBeInstanceOf(NotFoundError);
  });

  test("a member cannot download another project's attachment or edit someone else's note or comment", async () => {
    const alex = await authContextFor(emails.member);
    const emma = await authContextFor(emails.qa);
    const sv = await createIssue(alex, { projectId: await projectId("SV"), type: "EPIC", title: "Attachment isolation epic" });
    const saved = await addAttachment(alex, {
      issueId: sv.id,
      filename: "../../etc/passwd",
      contentType: "text/html",
      bytes: new TextEncoder().encode("secret"),
    });
    const stored = await testDb.issueAttachment.findUniqueOrThrow({ where: { id: saved.id } });
    expect(stored.originalFilename).toBe("passwd");
    expect(stored.objectKey).toMatch(/^attachments\/[0-9a-f-]+\/[0-9a-f-]+$/);
    expect(stored.objectKey).not.toContain("..");
    await expect(openAttachment(emma, saved.id)).rejects.toBeInstanceOf(NotFoundError);

    const hostile = await addAttachment(alex, {
      issueId: sv.id,
      filename: "quarterly\r\nSet-Cookie: x.pdf",
      contentType: "application/pdf",
      bytes: new TextEncoder().encode("%PDF"),
    });
    expect(hostile.filename).not.toContain("\n");
    expect(hostile.filename).not.toContain("\r");

    const policy = getAttachmentPolicy();
    await expect(
      addAttachment(alex, {
        issueId: sv.id,
        filename: "too-big.bin",
        contentType: "application/octet-stream",
        bytes: new Uint8Array(policy.maxBytes + 1),
      }),
    ).rejects.toThrow(/smaller/);

    await removeAttachment(alex, { attachmentId: saved.id });
    await expect(openAttachment(alex, saved.id)).rejects.toBeInstanceOf(NotFoundError);

    const aqua = await createIssue(alex, { projectId: await projectId("AQUA"), type: "EPIC", title: "Same project authorship" });
    const note = await addNote(alex, { issueId: aqua.id, content: "Alex planning note" });
    const comment = await addComment(alex, { issueId: aqua.id, body: "Alex comment" });
    await expect(updateNote(emma, { noteId: note.id, content: "Emma rewrite" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(updateComment(emma, { commentId: comment.id, body: "Emma rewrite" })).rejects.toBeInstanceOf(ForbiddenError);
    const hiddenNote = await addNote(alex, { issueId: sv.id, content: "Private SV note" });
    await expect(updateNote(emma, { noteId: hiddenNote.id, content: "Cross project rewrite" })).rejects.toBeInstanceOf(NotFoundError);
  });

  test("admin sees no project content, search hits, or export rows", async () => {
    const alex = await authContextFor(emails.member);
    const omar = await authContextFor(emails.admin);
    const token = `Hid${crypto.randomUUID().slice(0, 8)}`;
    const issue = await createIssue(alex, { projectId: await projectId("AQUA"), type: "EPIC", title: token });
    expect(await getVisibleIssueByNumber(omar, "AQUA", issue.number)).toBeNull();
    const found = await searchWorkspace(omar, token);
    expect(found.issues).toHaveLength(0);
    expect(found.projects).toHaveLength(0);
    expect(await loadVisibleIssueFacts(omar)).toHaveLength(0);
    const exported = await listVisibleCompletionEvidence(
      omar,
      parseReportFilters({ project: "AQUA", assignee: alex.userId }, "2026-10-17"),
    );
    expect(exported).toHaveLength(0);
    expect(() => assertWorkspacePermission(omar, "executive.view")).toThrow(ForbiddenError);
  });

  test("an executive can read the company portfolio and cannot write or administer outside membership", async () => {
    const alson = await authContextFor(emails.executive);
    const sarah = await authContextFor(emails.lead);
    const alex = await authContextFor(emails.member);
    const portfolio = await loadExecutivePortfolio(alson);
    expect(portfolio.some((project) => project.key === "AQUA")).toBe(true);
    const issue = await createIssue(alex, { projectId: await projectId("SV"), type: "EPIC", title: "Executive write fence" });
    await expect(updateIssue(alson, { issueId: issue.id, title: "Executive edit" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(addNote(alson, { issueId: issue.id, content: "Executive note" })).rejects.toBeInstanceOf(ForbiddenError);
    expect(() => assertWorkspacePermission(alson, "admin.access")).toThrow(ForbiddenError);
    await expect(loadExecutivePortfolio(sarah)).rejects.toBeInstanceOf(ForbiddenError);
    expect(() => assertWorkspacePermission(sarah, "executive.view")).toThrow(ForbiddenError);
  });

  test("notification reads stay with the recipient", async () => {
    const alex = await authContextFor(emails.member);
    const emma = await authContextFor(emails.qa);
    const alexNotice = await testDb.notification.create({
      data: { recipientId: alex.userId, type: "ISSUE_ASSIGNED", dedupeKey: `sec-alex-${crypto.randomUUID()}` },
    });
    const emmaNotice = await testDb.notification.create({
      data: { recipientId: emma.userId, type: "ISSUE_ASSIGNED", dedupeKey: `sec-emma-${crypto.randomUUID()}` },
    });
    await expect(markNotificationRead(emma, alexNotice.id)).rejects.toBeInstanceOf(NotFoundError);
    await markAllNotificationsRead(alex);
    expect((await testDb.notification.findUniqueOrThrow({ where: { id: emmaNotice.id } })).readAt).toBeNull();
    expect((await testDb.notification.findUniqueOrThrow({ where: { id: alexNotice.id } })).readAt).not.toBeNull();
  });

  test("search ignores a request for a hidden project title", async () => {
    const alex = await authContextFor(emails.member);
    const emma = await authContextFor(emails.qa);
    const alson = await authContextFor(emails.executive);
    const token = `SvOnly${crypto.randomUUID().slice(0, 6)}`;
    await createIssue(alex, { projectId: await projectId("SV"), type: "EPIC", title: token });
    expect((await searchWorkspace(emma, token)).issues).toHaveLength(0);
    expect((await searchWorkspace(alson, token)).issues.some((issue) => issue.title === token)).toBe(true);
    expect((await searchWorkspace(emma, `${token} project:AQUA`)).issues).toHaveLength(0);
  });

  test("the database rejects an invalid parent, a cross-project parent, a bad date range, and a second lead", async () => {
    const alex = await authContextFor(emails.member);
    const emma = await authContextFor(emails.qa);
    const aqua = await projectId("AQUA");
    const sv = await projectId("SV");
    const epic = await createIssue(alex, { projectId: aqua, type: "EPIC", title: "Hierarchy backstop epic" });
    const other = await createIssue(alex, { projectId: sv, type: "EPIC", title: "Other project epic" });
    await expect(
      testDb.issue.create({
        data: {
          projectId: aqua,
          number: 500_000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 200_000),
          type: "TASK",
          parentId: epic.id,
          title: "Task under an epic",
          reporterId: alex.userId,
          createdById: alex.userId,
        },
      }),
    ).rejects.toThrow(/Task parent must be a User Story/);
    await expect(
      testDb.issue.create({
        data: {
          projectId: sv,
          number: 700_000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 200_000),
          type: "USER_STORY",
          parentId: epic.id,
          title: "Story parented across projects",
          reporterId: alex.userId,
          createdById: alex.userId,
        },
      }),
    ).rejects.toThrow(/same project/);
    await expect(
      testDb.issue.update({
        where: { id: other.id },
        data: { plannedStartDate: new Date("2026-12-02T00:00:00.000Z"), dueDate: new Date("2026-12-01T00:00:00.000Z") },
      }),
    ).rejects.toThrow(/issues_planned_start_before_due|check/i);
    await expect(
      testDb.projectMember.update({
        where: { projectId_userId: { projectId: aqua, userId: emma.userId } },
        data: { role: "LEAD" },
      }),
    ).rejects.toThrow(/project_members_one_lead_per_project|unique/i);
  });

  test("concurrent issue creation cannot reuse a number", async () => {
    const alex = await authContextFor(emails.member);
    const project = await projectId("PMS");
    const created = await Promise.all([
      createIssue(alex, { projectId: project, type: "EPIC", title: "Concurrent key A" }),
      createIssue(alex, { projectId: project, type: "EPIC", title: "Concurrent key B" }),
    ]);
    expect(new Set(created.map((issue) => issue.number)).size).toBe(2);
  });

  test("activity rows cannot be updated or deleted", async () => {
    const alex = await authContextFor(emails.member);
    const issue = await createIssue(alex, { projectId: await projectId("PMS"), type: "EPIC", title: "Audit lock epic" });
    const event = await testDb.activityEvent.findFirstOrThrow({ where: { issueId: issue.id } });
    await expect(testDb.activityEvent.update({ where: { id: event.id }, data: { action: "tampered" } })).rejects.toThrow(/append-only/);
    await expect(testDb.activityEvent.delete({ where: { id: event.id } })).rejects.toThrow(/append-only/);
  });

  test("completion credit stays with the person who completed the issue", async () => {
    const alex = await authContextFor(emails.member);
    const sarah = await authContextFor(emails.lead);
    const issue = await createIssue(alex, { projectId: await projectId("AQUA"), type: "EPIC", title: "Credit stays epic" });
    await changeStatus(alex, issue.id, "DONE");
    await assignIssue(alex, issue.id, sarah.userId);
    const completed = await testDb.activityEvent.findFirstOrThrow({
      where: { issueId: issue.id, action: "issue.completed" },
    });
    expect(completed.actorUserId).toBe(alex.userId);
  });

  test("notification dedupe survives two concurrent inserts", async () => {
    const alex = await authContextFor(emails.member);
    const dedupeKey = `sec-dedupe-${crypto.randomUUID()}`;
    const writes = [0, 1].map(() =>
      testDb.notification.create({
        data: { recipientId: alex.userId, type: "ISSUE_DUE_SOON", dedupeKey },
      }),
    );
    const settled = await Promise.allSettled(writes);
    expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(settled.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  test("a deactivated user cannot obtain a session or an auth context", async () => {
    const { password } = await resetDevelopmentSeed();
    const lina = await testDb.user.findUniqueOrThrow({ where: { email: emails.deactivated }, select: { id: true } });
    expect(await loadAuthContext(testDb, lina.id, "company")).toBeNull();
    const before = await testDb.session.count({ where: { userId: lina.id } });
    await expect(auth.api.signInEmail({ body: { email: emails.deactivated, password } })).rejects.toThrow();
    expect(await testDb.session.count({ where: { userId: lina.id } })).toBe(before);
  });
});
