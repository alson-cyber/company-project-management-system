import { beforeAll, describe, expect, test } from "vitest";
import { listIssueCollaboration } from "@/modules/collaboration/collaboration.queries";
import { addAttachment, addComment, addNote, openAttachment, removeAttachment, removeNote, updateComment, updateNote } from "@/modules/collaboration/collaboration.service";
import { getAttachmentPolicy } from "@/server/config";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { getObjectStorage } from "@/server/storage";
import { getVisibleIssueByNumber } from "@/modules/issues/issue.queries";
import {
  addAcceptanceCriterion,
  archiveIssue,
  assignIssue,
  createIssue,
  moveAcceptanceCriterion,
  removeAcceptanceCriterion,
  restoreAcceptanceCriterion,
  setStoryFields,
  updateAcceptanceCriterion,
} from "@/modules/issues/issue.service";
import { authContextFor, emails, resetDevelopmentSeed, testDb } from "./helpers";

beforeAll(async () => {
  await resetDevelopmentSeed();
});

async function aquaId() {
  const project = await testDb.project.findFirstOrThrow({ where: { key: "AQUA" }, select: { id: true } });
  return project.id;
}

describe("issue collaboration", () => {
  test("edits a user story, acceptance criteria, and keeps the governing story", async () => {
    const alex = await authContextFor(emails.member);
    const projectId = await aquaId();
    const epic = await createIssue(alex, { projectId, type: "EPIC", title: "Collaboration coverage epic" });
    const story = await createIssue(alex, {
      projectId,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Collaboration coverage story",
      story: { asA: "guest", iWant: "to book", soThat: "I can leave" },
      acceptanceCriteria: ["Slots are visible", "Payment confirms the booking"],
    });
    await setStoryFields(alex, {
      issueId: story.id,
      asA: "resort guest",
      iWant: "to book activities through a simple flow",
      soThat: "I can reserve excursions without contacting the concierge",
    });

    const added = await addAcceptanceCriterion(alex, { issueId: story.id, text: "The guest sees a confirmation." });
    await updateAcceptanceCriterion(alex, { criterionId: added.id, text: "The guest sees a confirmation number." });
    await updateAcceptanceCriterion(alex, { criterionId: added.id, isMet: true });
    const moved = await moveAcceptanceCriterion(alex, { criterionId: added.id, direction: "up" });
    expect(moved.changed).toBe(true);
    await removeAcceptanceCriterion(alex, { criterionId: added.id });
    await restoreAcceptanceCriterion(alex, { criterionId: added.id });

    const task = await createIssue(alex, {
      projectId,
      type: "TASK",
      parentId: story.id,
      title: "Collaboration coverage task",
    });
    const visible = await getVisibleIssueByNumber(alex, "AQUA", task.number);
    expect(visible?.governingStory?.key).toBe(story.key);
    expect(visible?.governingStory?.asA).toBe("resort guest");
    expect(visible?.story).toBeNull();

    const sarah = await authContextFor(emails.lead);
    await assignIssue(alex, story.id, sarah.userId);
    const assignment = await testDb.activityEvent.findFirstOrThrow({
      where: { issueId: story.id, action: "issue.updated" },
      orderBy: { occurredAt: "desc" },
    });
    expect(assignment.after).toMatchObject({ assigneeName: "Sarah Kim" });

    const actions = await testDb.activityEvent.findMany({
      where: { issueId: story.id },
      select: { action: true },
    });
    const names = actions.map((event) => event.action);
    expect(names).toEqual(
      expect.arrayContaining([
        "issue.story_updated",
        "issue.criterion_added",
        "issue.criterion_updated",
        "issue.criterion_met",
        "issue.criterion_reordered",
        "issue.criterion_removed",
        "issue.criterion_restored",
      ]),
    );

    const seeded = await getVisibleIssueByNumber(alex, "AQUA", 6);
    expect(seeded?.governingStory?.key).toBe("AQUA-2");
    expect(seeded?.governingStory?.title).toBe("Streamline guest booking flow");
  });

  test("keeps notes and comments behind project participation", async () => {
    const alex = await authContextFor(emails.member);
    const mika = await authContextFor(emails.designer);
    const sarah = await authContextFor(emails.lead);
    const executive = await authContextFor(emails.executive);
    const admin = await authContextFor(emails.admin);
    const projectId = await aquaId();
    const epic = await createIssue(alex, { projectId, type: "EPIC", title: "Collaboration notes epic" });

    const note = await addNote(alex, { issueId: epic.id, content: "Check the provider calendar before promising slots." });
    await updateNote(alex, { noteId: note.id, content: "Check the provider calendar before promising a slot." });
    await expect(updateNote(mika, { noteId: note.id, content: "Changed by someone else." })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(addNote(executive, { issueId: epic.id, content: "Executive note" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(addNote(admin, { issueId: epic.id, content: "Admin note" })).rejects.toBeInstanceOf(NotFoundError);

    const comment = await addComment(mika, { issueId: epic.id, body: "The empty state still needs a time estimate." });
    await updateComment(mika, { commentId: comment.id, body: "The empty state still needs a time estimate on mobile." });
    await expect(updateComment(alex, { commentId: comment.id, body: "Taking this over." })).rejects.toBeInstanceOf(ForbiddenError);

    const listed = await listIssueCollaboration(executive, epic.id);
    expect(listed.notes.map((item) => item.content)).toContain("Check the provider calendar before promising a slot.");
    expect(listed.comments.map((item) => item.body)).toContain("The empty state still needs a time estimate on mobile.");
    await expect(listIssueCollaboration(admin, epic.id)).rejects.toBeInstanceOf(NotFoundError);

    await removeNote(sarah, { noteId: note.id });
    const afterRemoval = await listIssueCollaboration(alex, epic.id);
    expect(afterRemoval.notes).toHaveLength(0);

    const actions = await testDb.activityEvent.findMany({ where: { issueId: epic.id }, select: { action: true } });
    expect(actions.map((event) => event.action)).toEqual(
      expect.arrayContaining(["issue.note_added", "issue.note_updated", "issue.note_removed", "issue.comment_added", "issue.comment_updated"]),
    );
  });

  test("stores attachments without trusting the client path and rejects oversized or unauthorized access", async () => {
    const alex = await authContextFor(emails.member);
    const mika = await authContextFor(emails.designer);
    const executive = await authContextFor(emails.executive);
    const admin = await authContextFor(emails.admin);
    const projectId = await aquaId();
    const epic = await createIssue(alex, { projectId, type: "EPIC", title: "Collaboration files epic" });
    const saved = await addAttachment(alex, {
      issueId: epic.id,
      filename: "../booking reference.png",
      contentType: "image/png",
      bytes: Uint8Array.from([137, 80, 78, 71]),
    });

    const row = await testDb.issueAttachment.findUniqueOrThrow({ where: { id: saved.id } });
    expect(row.originalFilename).toBe("booking reference.png");
    expect(row.objectKey.startsWith(`attachments/${epic.id}/`)).toBe(true);
    expect(row.objectKey).not.toContain("booking");
    const storage = await getObjectStorage();
    expect(await storage.head(row.objectKey)).not.toBeNull();

    const policy = getAttachmentPolicy();
    await expect(
      addAttachment(alex, {
        issueId: epic.id,
        filename: "too-big.bin",
        contentType: "application/octet-stream",
        bytes: new Uint8Array(policy.maxBytes + 1),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await testDb.issueAttachment.count({ where: { issueId: epic.id, originalFilename: "too-big.bin" } })).toBe(0);

    await expect(openAttachment(admin, saved.id)).rejects.toBeInstanceOf(NotFoundError);
    const opened = await openAttachment(executive, saved.id);
    expect(opened.filename).toBe("booking reference.png");
    expect(opened.inline).toBe(true);
    await opened.body.cancel();
    await expect(
      addAttachment(executive, {
        issueId: epic.id,
        filename: "executive.txt",
        contentType: "text/plain",
        bytes: Uint8Array.from([1]),
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    await expect(removeAttachment(mika, { attachmentId: saved.id })).rejects.toBeInstanceOf(ForbiddenError);
    await removeAttachment(alex, { attachmentId: saved.id });
    expect(await storage.head(row.objectKey)).toBeNull();
    const removed = await testDb.issueAttachment.findUniqueOrThrow({ where: { id: saved.id } });
    expect(removed.deletedAt).not.toBeNull();
    await expect(openAttachment(alex, saved.id)).rejects.toBeInstanceOf(NotFoundError);

    const actions = await testDb.activityEvent.findMany({ where: { issueId: epic.id }, select: { action: true } });
    expect(actions.map((event) => event.action)).toEqual(
      expect.arrayContaining(["issue.attachment_added", "issue.attachment_removed"]),
    );
  });

  test("archiving an issue keeps its notes", async () => {
    const alex = await authContextFor(emails.member);
    const projectId = await aquaId();
    const epic = await createIssue(alex, { projectId, type: "EPIC", title: "Collaboration archive epic" });
    const story = await createIssue(alex, {
      projectId,
      type: "USER_STORY",
      parentId: epic.id,
      title: "Collaboration archive story",
      story: { asA: "guest", iWant: "a record", soThat: "archive does not erase it" },
    });
    const task = await createIssue(alex, { projectId, type: "TASK", parentId: story.id, title: "Collaboration archive task" });
    const subtask = await createIssue(alex, {
      projectId,
      type: "SUB_TASK",
      parentId: task.id,
      title: "Collaboration archive sub-task",
    });
    const note = await addNote(alex, { issueId: subtask.id, content: "Still needed after archive." });
    await archiveIssue(alex, { issueId: subtask.id });

    const listed = await listIssueCollaboration(alex, subtask.id);
    expect(listed.notes.map((item) => item.id)).toContain(note.id);
    const stored = await testDb.issueNote.findUniqueOrThrow({ where: { id: note.id } });
    expect(stored.deletedAt).toBeNull();
    await expect(addComment(alex, { issueId: subtask.id, body: "Too late" })).rejects.toBeInstanceOf(ValidationError);
  });
});
