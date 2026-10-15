import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";
import { recordActivity } from "@/modules/activity/activity.service";
import type { ActivityAction, JsonObject } from "@/modules/activity/activity.types";
import { LABEL_COLORS } from "@/modules/issues/issue.constants";
import { issueKey } from "@/modules/issues/issue.keys";
import {
  parentViolation,
  storyFieldViolation,
  typeChangeViolation,
  wouldCreateCycle,
} from "@/modules/issues/issue.rules";
import {
  addCriterionSchema,
  archiveIssueSchema,
  createIssueSchema,
  criterionIdSchema,
  issueIdSchema,
  setIssueLabelsSchema,
  setStoryFieldsSchema,
  updateCriterionSchema,
  updateIssueSchema,
} from "@/modules/issues/issue.schema";
import { calendarDayUtc, parseCalendarDate } from "@/lib/calendar";
import { prisma } from "@/server/db";
import { ConflictError, NotFoundError, ValidationError, parseInput } from "@/server/errors";
import { assertProjectPermission, hasProjectPermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";

type Tx = Prisma.TransactionClient;

const issueWriteSelect = {
  id: true,
  projectId: true,
  number: true,
  type: true,
  parentId: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  assigneeId: true,
  reporterId: true,
  createdById: true,
  dueDate: true,
  completedAt: true,
  completedById: true,
  archivedAt: true,
} satisfies Prisma.IssueSelect;

type IssueRow = Prisma.IssueGetPayload<{ select: typeof issueWriteSelect }>;

function actorOf(ctx: AuthContext) {
  return { type: "USER" as const, userId: ctx.userId };
}

function fieldSnapshot(issue: IssueRow): JsonObject {
  return {
    type: issue.type,
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    parentId: issue.parentId,
    assigneeId: issue.assigneeId,
    reporterId: issue.reporterId,
    dueDate: issue.dueDate ? calendarDayUtc(issue.dueDate) : null,
  };
}

function diffFields(before: JsonObject, after: JsonObject): { before: JsonObject; after: JsonObject } | null {
  const changedBefore: JsonObject = {};
  const changedAfter: JsonObject = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    if (before[key] === after[key]) continue;
    changedBefore[key] = before[key] ?? null;
    changedAfter[key] = after[key] ?? null;
  }
  if (Object.keys(changedAfter).length === 0) return null;
  return { before: changedBefore, after: changedAfter };
}

async function requireVisibleProject(tx: Tx, ctx: AuthContext, projectId: string) {
  const project = await tx.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspace.id, archivedAt: null },
    select: { id: true, key: true, workspaceId: true },
  });
  if (!project) throw new NotFoundError("Project not found.");
  assertProjectPermission(ctx, "project.view", project.id);
  return project;
}

function assertCanMutate(ctx: AuthContext, projectId: string) {
  assertProjectPermission(ctx, "project.participate", projectId);
}

async function requireIssue(tx: Tx, ctx: AuthContext, issueId: string, permission: "project.view" | "project.participate") {
  const issue = await tx.issue.findFirst({
    where: { id: issueId, project: { workspaceId: ctx.workspace.id } },
    select: { ...issueWriteSelect, project: { select: { id: true, key: true, workspaceId: true } } },
  });
  if (!issue) throw new NotFoundError("Issue not found.");
  assertProjectPermission(ctx, permission, issue.projectId);
  return issue;
}

async function assertProjectParticipant(tx: Tx, projectId: string, userId: string, field: string) {
  const membership = await tx.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { user: { select: { status: true } } },
  });
  if (!membership || membership.user.status !== "ACTIVE") {
    throw new ValidationError("Assignee must be an active member of this project.", { [field]: ["Not a project member."] });
  }
}

async function loadParent(tx: Tx, parentId: string, projectId: string) {
  const parent = await tx.issue.findFirst({
    where: { id: parentId },
    select: { id: true, type: true, projectId: true, archivedAt: true },
  });
  if (!parent) throw new ValidationError("Parent issue not found.", { parentId: ["Unknown parent."] });
  if (parent.projectId !== projectId) {
    throw new ValidationError("The parent must belong to the same project.", { parentId: ["Cross-project parents are not allowed."] });
  }
  if (parent.archivedAt) throw new ValidationError("Cannot attach work to an archived parent.", { parentId: ["Parent is archived."] });
  return parent;
}

async function allocateIssueNumber(tx: Tx, projectId: string): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ number: number }>>`
    UPDATE "projects"
    SET "next_issue_number" = "next_issue_number" + 1
    WHERE "id" = ${projectId}
    RETURNING "next_issue_number" - 1 AS "number"
  `;
  const number = Number(rows[0]?.number);
  if (!Number.isInteger(number) || number < 1) throw new ConflictError("Could not allocate an issue number.");
  return number;
}

async function nextRank(tx: Tx, projectId: string, parentId: string | null): Promise<string> {
  const siblingCount = await tx.issue.count({ where: { projectId, parentId } });
  return siblingCount.toString(36).padStart(6, "0");
}

async function syncLabels(tx: Tx, projectId: string, issueId: string, names: string[]): Promise<string[]> {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const labelIds: string[] = [];
  for (const [index, name] of unique.entries()) {
    const color = LABEL_COLORS[index % LABEL_COLORS.length] ?? "#64748b";
    const label = await tx.label.upsert({
      where: { projectId_name: { projectId, name } },
      create: { projectId, name, color },
      update: {},
      select: { id: true, projectId: true },
    });
    if (label.projectId !== projectId) throw new ValidationError("Label does not belong to this project.");
    labelIds.push(label.id);
  }
  await tx.issueLabel.deleteMany({ where: { issueId } });
  if (labelIds.length > 0) {
    await tx.issueLabel.createMany({ data: labelIds.map((labelId) => ({ issueId, labelId })) });
  }
  return unique;
}

async function writeIssueActivity(
  tx: Tx,
  ctx: AuthContext,
  input: {
    action: ActivityAction;
    issue: { id: string; projectId: string; number: number };
    projectKey: string;
    before?: JsonObject;
    after?: JsonObject;
    metadata?: JsonObject;
  },
) {
  await recordActivity(tx, {
    workspaceId: ctx.workspace.id,
    actor: actorOf(ctx),
    action: input.action,
    entityType: "issue",
    entityId: input.issue.id,
    projectId: input.issue.projectId,
    issueId: input.issue.id,
    before: input.before,
    after: input.after,
    metadata: { issueKey: issueKey(input.projectKey, input.issue.number), ...input.metadata },
  });
}

async function recordCompletionTransition(
  tx: Tx,
  ctx: AuthContext,
  issue: IssueRow,
  previousStatus: IssueStatus,
  nextStatus: IssueStatus,
  projectKey: string,
) {
  if (previousStatus !== "DONE" && nextStatus === "DONE") {
    await writeIssueActivity(tx, ctx, {
      action: "issue.completed",
      issue,
      projectKey,
      after: { status: nextStatus, assigneeId: issue.assigneeId },
      metadata: { assigneeIdAtCompletion: issue.assigneeId, completedById: ctx.userId },
    });
  }
  if (previousStatus === "DONE" && nextStatus !== "DONE") {
    await writeIssueActivity(tx, ctx, {
      action: "issue.reopened",
      issue,
      projectKey,
      after: { status: nextStatus },
    });
  }
}

export interface CreatedIssue {
  id: string;
  key: string;
  number: number;
  projectKey: string;
}

export async function createIssue(ctx: AuthContext, rawInput: unknown): Promise<CreatedIssue> {
  const input = parseInput(createIssueSchema, rawInput);

  return prisma.$transaction(async (tx) => {
    const project = await requireVisibleProject(tx, ctx, input.projectId);
    assertCanMutate(ctx, project.id);

    const parent = input.parentId ? await loadParent(tx, input.parentId, project.id) : null;
    const hierarchyError = parentViolation(input.type, parent, project.id);
    if (hierarchyError) throw new ValidationError(hierarchyError, { parentId: [hierarchyError] });

    if (input.assigneeId) await assertProjectParticipant(tx, project.id, input.assigneeId, "assigneeId");
    const reporterId = input.reporterId ?? ctx.userId;
    if (reporterId !== ctx.userId) await assertProjectParticipant(tx, project.id, reporterId, "reporterId");

    if (input.type === "USER_STORY") {
      const story = input.story;
      if (!story) throw new ValidationError("User Stories require As a, I want and So that.", { story: ["Required."] });
      const storyError = storyFieldViolation(story.asA, story.iWant, story.soThat);
      if (storyError) throw new ValidationError(storyError);
    }

    const number = await allocateIssueNumber(tx, project.id);
    const rank = await nextRank(tx, project.id, parent?.id ?? null);
    const status: IssueStatus = input.status ?? "TO_DO";
    const now = new Date();

    const created = await tx.issue.create({
      data: {
        projectId: project.id,
        number,
        type: input.type,
        parentId: parent?.id ?? null,
        title: input.title,
        description: input.description ?? null,
        status,
        priority: input.priority ?? "MEDIUM",
        assigneeId: input.assigneeId ?? null,
        reporterId,
        createdById: ctx.userId,
        dueDate: input.dueDate ? parseCalendarDate(input.dueDate) : null,
        rank,
        completedAt: status === "DONE" ? now : null,
        completedById: status === "DONE" ? ctx.userId : null,
      },
      select: issueWriteSelect,
    });

    if (input.type === "USER_STORY" && input.story) {
      await tx.userStoryDetails.create({
        data: {
          issueId: created.id,
          asA: input.story.asA,
          iWant: input.story.iWant,
          soThat: input.story.soThat,
        },
      });
    }

    if (input.acceptanceCriteria?.length) {
      await tx.acceptanceCriterion.createMany({
        data: input.acceptanceCriteria.map((text, position) => ({ issueId: created.id, position, text })),
      });
    }

    if (input.labels?.length) await syncLabels(tx, project.id, created.id, input.labels);

    const after: JsonObject = {
      ...fieldSnapshot(created),
      key: issueKey(project.key, created.number),
    };
    if (input.story) after.story = { asA: input.story.asA, iWant: input.story.iWant, soThat: input.story.soThat };
    if (input.labels?.length) after.labels = input.labels;
    if (input.acceptanceCriteria?.length) after.acceptanceCriteria = input.acceptanceCriteria;

    await writeIssueActivity(tx, ctx, { action: "issue.created", issue: created, projectKey: project.key, after });
    await recordCompletionTransition(tx, ctx, created, "TO_DO", status, project.key);

    return { id: created.id, key: issueKey(project.key, created.number), number: created.number, projectKey: project.key };
  });
}

export async function updateIssue(ctx: AuthContext, rawInput: unknown): Promise<{ changed: boolean; key: string }> {
  const input = parseInput(updateIssueSchema, rawInput);

  return prisma.$transaction(async (tx) => {
    const issue = await requireIssue(tx, ctx, input.issueId, "project.participate");
    if (issue.archivedAt) throw new ValidationError("Archived issues cannot be edited. Restore them first.");

    let parent = issue.parentId
      ? await tx.issue.findFirst({
          where: { id: issue.parentId },
          select: { id: true, type: true, projectId: true, archivedAt: true },
        })
      : null;

    if (input.parentId && input.parentId !== issue.parentId) {
      parent = await loadParent(tx, input.parentId, issue.projectId);
      const ancestors = await tx.issue.findMany({
        where: { projectId: issue.projectId },
        select: { id: true, parentId: true },
      });
      const parentOf = new Map(ancestors.map((row) => [row.id, row.parentId]));
      if (wouldCreateCycle(issue.id, input.parentId, (id) => parentOf.get(id) ?? null)) {
        throw new ValidationError("That parent would create a cycle.", { parentId: ["Cycle."] });
      }
    }

    const nextType: IssueType = input.type ?? issue.type;
    if (input.type && input.type !== issue.type) {
      const children = await tx.issue.findMany({
        where: { parentId: issue.id, archivedAt: null },
        select: { type: true },
      });
      const typeError = typeChangeViolation(nextType, parent, issue.projectId, children);
      if (typeError) throw new ValidationError(typeError, { type: [typeError] });
    }

    const nextParentId = input.parentId ?? issue.parentId;
    const hierarchyParent = nextParentId === (parent?.id ?? null) ? parent : parent;
    const resolvedParent =
      nextParentId && (!hierarchyParent || hierarchyParent.id !== nextParentId)
        ? await loadParent(tx, nextParentId, issue.projectId)
        : hierarchyParent;
    const hierarchyError = parentViolation(nextType, resolvedParent, issue.projectId);
    if (hierarchyError) throw new ValidationError(hierarchyError, { parentId: [hierarchyError] });

    if (input.assigneeId) await assertProjectParticipant(tx, issue.projectId, input.assigneeId, "assigneeId");
    if (input.reporterId) await assertProjectParticipant(tx, issue.projectId, input.reporterId, "reporterId");

    const nextStatus: IssueStatus = input.status ?? issue.status;
    const now = new Date();
    const data: Prisma.IssueUncheckedUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId;
    if (input.reporterId !== undefined) data.reporterId = input.reporterId;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate ? parseCalendarDate(input.dueDate) : null;
    if (input.parentId !== undefined) {
      data.parentId = input.parentId;
      data.rank = await nextRank(tx, issue.projectId, input.parentId);
    }
    if (input.type !== undefined) data.type = input.type;

    if (issue.status !== "DONE" && nextStatus === "DONE") {
      data.completedAt = now;
      data.completedById = ctx.userId;
    }
    if (issue.status === "DONE" && nextStatus !== "DONE") {
      data.completedAt = null;
      data.completedById = null;
    }

    const before = fieldSnapshot(issue);
    const updated = await tx.issue.update({ where: { id: issue.id }, data, select: issueWriteSelect });
    const after = fieldSnapshot(updated);
    const changed = diffFields(before, after);
    if (!changed) return { changed: false, key: issueKey(issue.project.key, issue.number) };

    await writeIssueActivity(tx, ctx, {
      action: "issue.updated",
      issue: updated,
      projectKey: issue.project.key,
      before: changed.before,
      after: changed.after,
    });
    await recordCompletionTransition(tx, ctx, updated, issue.status, updated.status, issue.project.key);
    return { changed: true, key: issueKey(issue.project.key, updated.number) };
  });
}

export async function changeStatus(ctx: AuthContext, issueId: string, status: IssueStatus) {
  return updateIssue(ctx, { issueId, status });
}

export async function changePriority(ctx: AuthContext, issueId: string, priority: IssuePriority) {
  return updateIssue(ctx, { issueId, priority });
}

export async function assignIssue(ctx: AuthContext, issueId: string, assigneeId: string | null) {
  return updateIssue(ctx, { issueId, assigneeId });
}

export async function setDueDate(ctx: AuthContext, issueId: string, dueDate: string | null) {
  return updateIssue(ctx, { issueId, dueDate });
}

export async function reparentIssue(ctx: AuthContext, issueId: string, parentId: string) {
  return updateIssue(ctx, { issueId, parentId });
}

async function collectDescendantIds(tx: Tx, rootId: string): Promise<string[]> {
  const ids: string[] = [];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await tx.issue.findMany({ where: { parentId: { in: frontier } }, select: { id: true } });
    frontier = children.map((child) => child.id);
    ids.push(...frontier);
  }
  return ids;
}

export async function archiveIssue(ctx: AuthContext, rawInput: unknown): Promise<{ archivedIds: string[] }> {
  const input = parseInput(archiveIssueSchema, rawInput);

  return prisma.$transaction(async (tx) => {
    const issue = await requireIssue(tx, ctx, input.issueId, "project.participate");
    if (issue.archivedAt) return { archivedIds: [] };

    const descendantIds = await collectDescendantIds(tx, issue.id);
    const liveChildren = await tx.issue.count({
      where: { id: { in: descendantIds }, archivedAt: null },
    });
    if (liveChildren > 0 && !input.includeDescendants) {
      throw new ValidationError("Archive descendant work first, or archive the whole subtree.", {
        issueId: ["Has non-archived children."],
      });
    }

    const ids = input.includeDescendants ? [issue.id, ...descendantIds] : [issue.id];
    const now = new Date();
    const targets = await tx.issue.findMany({
      where: { id: { in: ids }, archivedAt: null },
      select: issueWriteSelect,
    });

    await tx.issue.updateMany({
      where: { id: { in: targets.map((row) => row.id) } },
      data: { archivedAt: now, archivedById: ctx.userId },
    });

    for (const target of targets) {
      await writeIssueActivity(tx, ctx, {
        action: "issue.archived",
        issue: target,
        projectKey: issue.project.key,
        before: { archived: false },
        after: { archived: true },
        metadata: { subtree: ids.length > 1 },
      });
    }
    return { archivedIds: targets.map((row) => row.id) };
  });
}

export async function restoreIssue(ctx: AuthContext, rawInput: unknown): Promise<{ restored: boolean }> {
  const input = parseInput(issueIdSchema, rawInput);

  return prisma.$transaction(async (tx) => {
    const issue = await requireIssue(tx, ctx, input.issueId, "project.participate");
    if (!issue.archivedAt) return { restored: false };
    if (issue.parentId) {
      const parent = await tx.issue.findFirst({ where: { id: issue.parentId }, select: { archivedAt: true } });
      if (parent?.archivedAt) {
        throw new ValidationError("Restore the parent issue before restoring this one.", { issueId: ["Parent is archived."] });
      }
    }

    await tx.issue.update({
      where: { id: issue.id },
      data: { archivedAt: null, archivedById: null },
    });
    await writeIssueActivity(tx, ctx, {
      action: "issue.restored",
      issue,
      projectKey: issue.project.key,
      before: { archived: true },
      after: { archived: false },
    });
    return { restored: true };
  });
}

export async function setStoryFields(ctx: AuthContext, rawInput: unknown): Promise<{ changed: boolean }> {
  const input = parseInput(setStoryFieldsSchema, rawInput);

  return prisma.$transaction(async (tx) => {
    const issue = await requireIssue(tx, ctx, input.issueId, "project.participate");
    if (issue.type !== "USER_STORY") throw new ValidationError("Only User Stories have story fields.");
    if (issue.archivedAt) throw new ValidationError("Archived issues cannot be edited. Restore them first.");

    const existing = await tx.userStoryDetails.findUnique({ where: { issueId: issue.id } });
    const before = existing ? { asA: existing.asA, iWant: existing.iWant, soThat: existing.soThat } : null;
    const after = { asA: input.asA, iWant: input.iWant, soThat: input.soThat };
    if (before && before.asA === after.asA && before.iWant === after.iWant && before.soThat === after.soThat) {
      return { changed: false };
    }

    await tx.userStoryDetails.upsert({
      where: { issueId: issue.id },
      create: { issueId: issue.id, ...after },
      update: after,
    });
    await writeIssueActivity(tx, ctx, {
      action: "issue.story_updated",
      issue,
      projectKey: issue.project.key,
      before: before ?? undefined,
      after,
    });
    return { changed: true };
  });
}

export async function addAcceptanceCriterion(ctx: AuthContext, rawInput: unknown): Promise<{ id: string }> {
  const input = parseInput(addCriterionSchema, rawInput);

  return prisma.$transaction(async (tx) => {
    const issue = await requireIssue(tx, ctx, input.issueId, "project.participate");
    if (issue.type !== "USER_STORY") throw new ValidationError("Acceptance criteria belong on User Stories.");
    if (issue.archivedAt) throw new ValidationError("Archived issues cannot be edited. Restore them first.");

    const last = await tx.acceptanceCriterion.aggregate({
      where: { issueId: issue.id, deletedAt: null },
      _max: { position: true },
    });
    const position = (last._max.position ?? -1) + 1;
    const created = await tx.acceptanceCriterion.create({
      data: { issueId: issue.id, position, text: input.text },
      select: { id: true, text: true, position: true },
    });
    await recordActivity(tx, {
      workspaceId: ctx.workspace.id,
      actor: actorOf(ctx),
      action: "issue.criterion_added",
      entityType: "acceptance_criterion",
      entityId: created.id,
      projectId: issue.projectId,
      issueId: issue.id,
      after: { text: created.text, position: created.position },
      metadata: { issueKey: issueKey(issue.project.key, issue.number) },
    });
    return { id: created.id };
  });
}

export async function updateAcceptanceCriterion(ctx: AuthContext, rawInput: unknown): Promise<{ changed: boolean }> {
  const input = parseInput(updateCriterionSchema, rawInput);

  return prisma.$transaction(async (tx) => {
    const criterion = await tx.acceptanceCriterion.findFirst({
      where: { id: input.criterionId, deletedAt: null },
      include: { issue: { select: { ...issueWriteSelect, project: { select: { key: true, workspaceId: true } } } } },
    });
    if (!criterion || criterion.issue.project.workspaceId !== ctx.workspace.id) throw new NotFoundError("Issue not found.");
    assertProjectPermission(ctx, "project.participate", criterion.issue.projectId);
    if (criterion.issue.archivedAt) throw new ValidationError("Archived issues cannot be edited. Restore them first.");

    const data: Prisma.AcceptanceCriterionUpdateInput = {};
    const before: JsonObject = { text: criterion.text, isMet: criterion.isMet };
    if (input.text !== undefined) data.text = input.text;
    if (input.isMet !== undefined) {
      data.isMet = input.isMet;
      if (input.isMet) {
        data.metAt = new Date();
        data.metBy = { connect: { id: ctx.userId } };
      } else {
        data.metAt = null;
        data.metBy = { disconnect: true };
      }
    }
    const updated = await tx.acceptanceCriterion.update({ where: { id: criterion.id }, data });
    const after: JsonObject = { text: updated.text, isMet: updated.isMet };
    const changed = diffFields(before, after);
    if (!changed) return { changed: false };

    let action: ActivityAction = "issue.criterion_updated";
    if (input.isMet === true && !criterion.isMet) action = "issue.criterion_met";
    if (input.isMet === false && criterion.isMet) action = "issue.criterion_unmet";

    await recordActivity(tx, {
      workspaceId: ctx.workspace.id,
      actor: actorOf(ctx),
      action,
      entityType: "acceptance_criterion",
      entityId: criterion.id,
      projectId: criterion.issue.projectId,
      issueId: criterion.issue.id,
      before: changed.before,
      after: changed.after,
      metadata: { issueKey: issueKey(criterion.issue.project.key, criterion.issue.number) },
    });
    return { changed: true };
  });
}

export async function removeAcceptanceCriterion(ctx: AuthContext, rawInput: unknown): Promise<{ removed: boolean }> {
  const input = parseInput(criterionIdSchema, rawInput);

  return prisma.$transaction(async (tx) => {
    const criterion = await tx.acceptanceCriterion.findFirst({
      where: { id: input.criterionId, deletedAt: null },
      include: { issue: { select: { ...issueWriteSelect, project: { select: { key: true, workspaceId: true } } } } },
    });
    if (!criterion || criterion.issue.project.workspaceId !== ctx.workspace.id) throw new NotFoundError("Issue not found.");
    assertProjectPermission(ctx, "project.participate", criterion.issue.projectId);
    if (criterion.issue.archivedAt) throw new ValidationError("Archived issues cannot be edited. Restore them first.");

    await tx.acceptanceCriterion.update({ where: { id: criterion.id }, data: { deletedAt: new Date() } });
    await recordActivity(tx, {
      workspaceId: ctx.workspace.id,
      actor: actorOf(ctx),
      action: "issue.criterion_removed",
      entityType: "acceptance_criterion",
      entityId: criterion.id,
      projectId: criterion.issue.projectId,
      issueId: criterion.issue.id,
      before: { text: criterion.text },
      metadata: { issueKey: issueKey(criterion.issue.project.key, criterion.issue.number) },
    });
    return { removed: true };
  });
}

export async function setIssueLabels(ctx: AuthContext, rawInput: unknown): Promise<{ labels: string[] }> {
  const input = parseInput(setIssueLabelsSchema, rawInput);

  return prisma.$transaction(async (tx) => {
    const issue = await requireIssue(tx, ctx, input.issueId, "project.participate");
    if (issue.archivedAt) throw new ValidationError("Archived issues cannot be edited. Restore them first.");

    const existing = await tx.issueLabel.findMany({
      where: { issueId: issue.id },
      select: { label: { select: { name: true } } },
    });
    const before = existing.map((row) => row.label.name).sort();
    const after = await syncLabels(tx, issue.projectId, issue.id, input.labels);
    const sorted = [...after].sort();
    if (before.join("\0") === sorted.join("\0")) return { labels: after };

    await writeIssueActivity(tx, ctx, {
      action: "issue.labels_changed",
      issue,
      projectKey: issue.project.key,
      before: { labels: before },
      after: { labels: sorted },
    });
    return { labels: after };
  });
}

export function hasProjectWriteAccess(ctx: AuthContext, projectId: string): boolean {
  return hasProjectPermission(ctx, "project.participate", projectId);
}
