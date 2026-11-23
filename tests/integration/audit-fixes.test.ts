import { beforeAll, describe, expect, test } from "vitest";
import { addAttachment, addComment, addNote, purgeAttachment, removeAttachment, removeComment, updateNote } from "@/modules/collaboration/collaboration.service";
import { listIssueCollaboration } from "@/modules/collaboration/collaboration.queries";
import { archiveIssue, changeStatus, createIssue, restoreIssue, updateIssue } from "@/modules/issues/issue.service";
import { addProjectMember, archiveProject, removeProjectMember, restoreProject, transferProjectLead } from "@/modules/projects/project.service";
import { memberFacts } from "@/modules/projects/workspace.model";
import { listCompletionHistoryIssues, listProjectWorkspaceIssues } from "@/modules/projects/workspace.queries";
import { ConflictError, ForbiddenError, ValidationError } from "@/server/errors";
import { getObjectStorage } from "@/server/storage";
import { authContextFor, emails, resetDevelopmentSeed, testDb } from "./helpers";

beforeAll(async () => {
  await resetDevelopmentSeed();
});

describe("audit fixes", () => {
  test("a lead can add a member, transfer the lead, and cannot remove the lead", async () => {
    const sarah = await authContextFor(emails.lead);
    const project = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { id: true } });
    const members = await testDb.projectMember.findMany({ where: { projectId: project.id }, select: { userId: true } });
    const people = await testDb.user.findMany({
      where: { status: "ACTIVE", workspaceMemberships: { some: { workspaceId: sarah.workspace.id } } },
      select: { id: true, email: true },
    });
    const outsider = people.find((person) => !members.some((member) => member.userId === person.id));
    expect(outsider).toBeTruthy();
    await addProjectMember(sarah, { projectId: project.id, userId: outsider!.id });
    await expect(removeProjectMember(sarah, { projectId: project.id, userId: sarah.userId })).rejects.toBeInstanceOf(ValidationError);
    await transferProjectLead(sarah, { projectId: project.id, userId: outsider!.id });
    const next = await authContextFor(outsider!.email);
    await removeProjectMember(next, { projectId: project.id, userId: sarah.userId });
    const lead = await testDb.projectMember.findFirstOrThrow({ where: { projectId: project.id, role: "LEAD" } });
    expect(lead.userId).toBe(outsider!.id);
    await transferProjectLead(next, { projectId: project.id, userId: next.userId });
  });

  test("removing a file keeps its bytes, and an executable upload is refused", async () => {
    const alex = await authContextFor(emails.member);
    const project = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { id: true } });
    const issue = await createIssue(alex, { projectId: project.id, type: "EPIC", title: "Audit file epic" });
    const saved = await addAttachment(alex, {
      issueId: issue.id,
      filename: "notes.txt",
      contentType: "text/plain",
      bytes: Uint8Array.from([104, 101, 108, 108, 111]),
    });
    const row = await testDb.issueAttachment.findUniqueOrThrow({ where: { id: saved.id } });
    expect(row.checksumSha256).toHaveLength(64);
    expect(row.contentType).toBe("application/octet-stream");
    await removeAttachment(alex, { attachmentId: saved.id });
    const storage = await getObjectStorage();
    expect(await storage.head(row.objectKey)).not.toBeNull();
    await expect(
      addAttachment(alex, {
        issueId: issue.id,
        filename: "setup.exe",
        contentType: "application/octet-stream",
        bytes: Uint8Array.from([0x4d, 0x5a, 0x90]),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      addAttachment(alex, {
        issueId: issue.id,
        filename: "notes.txt",
        contentType: "text/plain",
        bytes: Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    const png = await addAttachment(alex, {
      issueId: issue.id,
      filename: "screen.png",
      contentType: "text/plain",
      bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    });
    expect(png.contentType).toBe("image/png");
  });

  test("only an admin can purge a file that was already removed, and the purge is audited", async () => {
    const alex = await authContextFor(emails.member);
    const admin = await authContextFor(emails.admin);
    const project = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { id: true } });
    const issue = await createIssue(alex, { projectId: project.id, type: "EPIC", title: "Audit purge epic" });
    const saved = await addAttachment(alex, {
      issueId: issue.id,
      filename: "evidence.txt",
      contentType: "text/plain",
      bytes: Uint8Array.from([101, 118, 105, 100, 101, 110, 99, 101]),
    });
    const row = await testDb.issueAttachment.findUniqueOrThrow({ where: { id: saved.id } });
    await expect(purgeAttachment(alex, { attachmentId: saved.id })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(purgeAttachment(admin, { attachmentId: saved.id })).rejects.toBeInstanceOf(ValidationError);
    expect(await testDb.activityEvent.count({ where: { entityId: saved.id, action: "issue.attachment_purged" } })).toBe(0);
    await removeAttachment(alex, { attachmentId: saved.id });
    await purgeAttachment(admin, { attachmentId: saved.id });
    const storage = await getObjectStorage();
    expect(await storage.head(row.objectKey)).toBeNull();
    const purged = await testDb.issueAttachment.findUniqueOrThrow({ where: { id: saved.id } });
    expect(purged.purgedAt).not.toBeNull();
    expect(await testDb.activityEvent.count({ where: { entityId: saved.id, action: "issue.attachment_purged" } })).toBe(1);
    await purgeAttachment(admin, { attachmentId: saved.id });
    expect(await testDb.activityEvent.count({ where: { entityId: saved.id, action: "issue.attachment_purged" } })).toBe(1);
  });

  test("a storage failure during purge keeps the bytes and the audit for a later retry", async () => {
    const alex = await authContextFor(emails.member);
    const admin = await authContextFor(emails.admin);
    const project = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { id: true } });
    const issue = await createIssue(alex, { projectId: project.id, type: "EPIC", title: "Retry purge epic" });
    const saved = await addAttachment(alex, {
      issueId: issue.id,
      filename: "retry-me.txt",
      contentType: "text/plain",
      bytes: Uint8Array.from([114, 101, 116, 114, 121]),
    });
    await removeAttachment(alex, { attachmentId: saved.id });
    const storage = await getObjectStorage();
    const row = await testDb.issueAttachment.findUniqueOrThrow({ where: { id: saved.id } });
    await expect(
      purgeAttachment(admin, { attachmentId: saved.id }, { delete: async () => { throw new Error("storage unavailable"); } }),
    ).rejects.toThrow(/storage unavailable/);
    const pending = await testDb.issueAttachment.findUniqueOrThrow({ where: { id: saved.id } });
    expect(pending.purgeRequestedAt).not.toBeNull();
    expect(pending.purgedAt).toBeNull();
    expect(await storage.head(row.objectKey)).not.toBeNull();
    expect(await testDb.activityEvent.count({ where: { entityId: saved.id, action: "issue.attachment_purged" } })).toBe(1);
    await purgeAttachment(admin, { attachmentId: saved.id });
    expect(await storage.head(row.objectKey)).toBeNull();
    expect(await testDb.activityEvent.count({ where: { entityId: saved.id, action: "issue.attachment_purged" } })).toBe(1);
  });

  test("a note keeps every revision, and a removed comment stays as a placeholder", async () => {
    const alex = await authContextFor(emails.member);
    const project = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { id: true } });
    const issue = await createIssue(alex, { projectId: project.id, type: "EPIC", title: "Audit note epic" });
    const note = await addNote(alex, { issueId: issue.id, title: "First", category: "DECISION", content: "Original decision text." });
    await updateNote(alex, { noteId: note.id, title: "First", category: "DECISION", content: "Original decision text. Extra detail past the excerpt." });
    const revisions = await testDb.issueNoteRevision.findMany({ where: { noteId: note.id }, orderBy: { revision: "asc" } });
    expect(revisions.map((revision) => revision.content)).toEqual([
      "Original decision text.",
      "Original decision text. Extra detail past the excerpt.",
    ]);
    const comment = await addComment(alex, { issueId: issue.id, body: "Please keep this visible after removal." });
    await removeComment(alex, { commentId: comment.id });
    const listed = await listIssueCollaboration(alex, issue.id);
    expect(listed.comments).toEqual([expect.objectContaining({ id: comment.id, deleted: true, body: null })]);
  });

  test("a no-op save does not move updatedAt, and two completions cannot both record", async () => {
    const alex = await authContextFor(emails.member);
    const project = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { id: true } });
    const epic = await createIssue(alex, { projectId: project.id, type: "EPIC", title: "Audit race epic" });
    const story = await createIssue(alex, {
      projectId: project.id,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Audit race story",
      story: { asA: "guest", iWant: "one completion", soThat: "the count stays honest" },
    });
    const task = await createIssue(alex, { projectId: project.id, type: "TASK", parentId: story.id, title: "Audit race task" });
    const before = await testDb.issue.findUniqueOrThrow({ where: { id: task.id }, select: { updatedAt: true, title: true } });
    const saved = await updateIssue(alex, { issueId: task.id, title: before.title });
    expect(saved.changed).toBe(false);
    const after = await testDb.issue.findUniqueOrThrow({ where: { id: task.id }, select: { updatedAt: true } });
    expect(after.updatedAt.toISOString()).toBe(before.updatedAt.toISOString());

    const results = await Promise.allSettled([changeStatus(alex, task.id, "DONE"), changeStatus(alex, task.id, "DONE")]);
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected.length).toBeGreaterThanOrEqual(0);
    if (rejected.length > 0) {
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
    }
    const completions = await testDb.activityEvent.count({ where: { issueId: task.id, action: "issue.completed" } });
    expect(completions).toBe(1);
  });

  test("an admin can archive and restore a project without deleting it", async () => {
    const omar = await authContextFor(emails.admin);
    const alex = await authContextFor(emails.member);
    const project = await testDb.project.create({
      data: {
        workspaceId: omar.workspace.id,
        key: `Z${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`,
        name: "Audit archive",
        color: "#2563eb",
        createdById: omar.userId,
        members: { create: { userId: alex.userId, role: "LEAD", addedById: omar.userId } },
      },
      select: { id: true },
    });
    await archiveProject(omar, { projectId: project.id });
    const alexAfter = await authContextFor(emails.member);
    await expect(createIssue(alexAfter, { projectId: project.id, type: "EPIC", title: "Hidden" })).rejects.toBeInstanceOf(Error);
    const hidden = await testDb.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(hidden.archivedAt).not.toBeNull();
    await restoreProject(omar, { projectId: project.id });
    const restored = await testDb.project.findUniqueOrThrow({ where: { id: project.id } });
    expect(restored.archivedAt).toBeNull();
    await expect(archiveProject(alex, { projectId: project.id })).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("removing a member while the lead role moves still leaves one lead", async () => {
    const omar = await authContextFor(emails.admin);
    const alex = await authContextFor(emails.member);
    const project = await testDb.project.create({
      data: {
        workspaceId: omar.workspace.id,
        key: `Z${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`,
        name: "Membership race",
        color: "#2563eb",
        createdById: omar.userId,
        members: { create: { userId: (await authContextFor(emails.lead)).userId, role: "LEAD", addedById: omar.userId } },
      },
      select: { id: true },
    });
    const lead = await authContextFor(emails.lead);
    await addProjectMember(lead, { projectId: project.id, userId: alex.userId });
    await Promise.allSettled([
      removeProjectMember(lead, { projectId: project.id, userId: alex.userId }),
      transferProjectLead(lead, { projectId: project.id, userId: alex.userId }),
    ]);
    expect(await testDb.projectMember.count({ where: { projectId: project.id, role: "LEAD" } })).toBe(1);
  });

  test("completion credit remains after archive and current work returns on restore", async () => {
    const alex = await authContextFor(emails.member);
    const project = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { id: true } });
    const issue = await createIssue(alex, {
      projectId: project.id,
      type: "EPIC",
      title: "Credit survives archive",
      assigneeId: alex.userId,
      dueDate: "2020-01-01",
    });
    await changeStatus(alex, issue.id, "DONE");
    await changeStatus(alex, issue.id, "IN_PROGRESS");
    await archiveIssue(alex, { issueId: issue.id });
    const credits = [{ actorUserId: alex.userId, issueId: issue.id }];
    const whileArchived = memberFacts(
      alex.userId,
      await listProjectWorkspaceIssues(alex, project.id),
      credits,
      await listCompletionHistoryIssues(alex, project.id),
    );
    expect(whileArchived.completed.map((item) => item.id)).toContain(issue.id);
    expect(whileArchived.openAssigned.map((item) => item.id)).not.toContain(issue.id);
    expect(whileArchived.overdueAssigned.map((item) => item.id)).not.toContain(issue.id);
    await restoreIssue(alex, { issueId: issue.id });
    const restored = memberFacts(alex.userId, await listProjectWorkspaceIssues(alex, project.id), credits, []);
    expect(restored.completed.map((item) => item.id)).toContain(issue.id);
    expect(restored.openAssigned.map((item) => item.id)).toContain(issue.id);
    expect(restored.overdueAssigned.map((item) => item.id)).toContain(issue.id);
  });
});
