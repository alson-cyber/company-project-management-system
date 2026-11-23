import { beforeAll, describe, expect, test } from "vitest";
import { addAttachment, addComment, addNote, removeAttachment, removeComment, updateNote } from "@/modules/collaboration/collaboration.service";
import { listIssueCollaboration } from "@/modules/collaboration/collaboration.queries";
import { changeStatus, createIssue, updateIssue } from "@/modules/issues/issue.service";
import { addProjectMember, archiveProject, removeProjectMember, restoreProject, transferProjectLead } from "@/modules/projects/project.service";
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
});
