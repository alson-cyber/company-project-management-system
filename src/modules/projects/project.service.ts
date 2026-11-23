import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { ProjectHealth } from "@/generated/prisma/enums";
import { recordActivity } from "@/modules/activity/activity.service";
import { notifyMembership } from "@/modules/attention/notify";
import { PROJECT_COLORS } from "@/modules/projects/project.constants";
import {
  addProjectMemberSchema,
  createProjectSchema,
  projectIdSchema,
  removeProjectMemberSchema,
  setProjectHealthSchema,
  transferProjectLeadSchema,
  updateProjectSchema,
} from "@/modules/projects/project.schema";
import { calendarDayUtc } from "@/lib/calendar";
import { prisma } from "@/server/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError, parseInput } from "@/server/errors";
import { assertProjectPermission, assertWorkspacePermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Creates a project with its lead as the first member. Admin only: creating projects is
 * workspace configuration. The Admin does not become a member unless chosen as lead.
 */
export async function createProject(ctx: AuthContext, rawInput: unknown): Promise<{ id: string; key: string }> {
  assertWorkspacePermission(ctx, "project.create");
  const input = parseInput(createProjectSchema, rawInput);

  const lead = await prisma.workspaceMember.findFirst({
    where: { workspaceId: ctx.workspace.id, userId: input.leadUserId, user: { status: "ACTIVE" } },
    select: { userId: true },
  });
  if (!lead) throw new ValidationError("Choose an active workspace member as lead.", { leadUserId: ["Unknown user."] });

  const color = input.color ?? PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)] ?? PROJECT_COLORS[0];

  try {
    return await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          workspaceId: ctx.workspace.id,
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          status: input.status,
          targetDate: input.targetDate ?? null,
          color,
          createdById: ctx.userId,
          members: { create: { userId: lead.userId, role: "LEAD", addedById: ctx.userId } },
        },
        select: { id: true, key: true, name: true, status: true },
      });

      const actor = { type: "USER", userId: ctx.userId } as const;
      await recordActivity(tx, {
        workspaceId: ctx.workspace.id,
        actor,
        action: "project.created",
        entityType: "project",
        entityId: project.id,
        projectId: project.id,
        after: { key: project.key, name: project.name, status: project.status },
      });
      const membershipActivityId = await recordActivity(tx, {
        workspaceId: ctx.workspace.id,
        actor,
        action: "project.member_added",
        entityType: "project_member",
        entityId: `${project.id}:${lead.userId}`,
        projectId: project.id,
        after: { userId: lead.userId, role: "LEAD" },
      });
      await notifyMembership(tx, {
        actorId: ctx.userId,
        projectId: project.id,
        userId: lead.userId,
        role: "LEAD",
        activityId: membershipActivityId,
      });

      return { id: project.id, key: project.key };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError(`Project key ${input.key} is already in use.`, { key: ["This key is already in use."] });
    }
    throw error;
  }
}

/** Sets the human-assessed health state. Project Lead only; every change is audited. */
export async function setProjectHealth(
  ctx: AuthContext,
  rawInput: unknown,
): Promise<{ changed: boolean; health: ProjectHealth }> {
  const input = parseInput(setProjectHealthSchema, rawInput);

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, workspaceId: ctx.workspace.id, archivedAt: null },
    select: { id: true, health: true, healthNote: true },
  });
  if (!project) throw new NotFoundError("Project not found.");
  assertProjectPermission(ctx, "project.health.set", project.id);

  const note = input.note ?? null;
  if (project.health === input.health && project.healthNote === note) {
    return { changed: false, health: input.health };
  }

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: project.id },
      data: { health: input.health, healthNote: note, healthUpdatedAt: new Date(), healthUpdatedById: ctx.userId },
    });
    await recordActivity(tx, {
      workspaceId: ctx.workspace.id,
      actor: { type: "USER", userId: ctx.userId },
      action: "project.health_changed",
      entityType: "project",
      entityId: project.id,
      projectId: project.id,
      before: { health: project.health, note: project.healthNote },
      after: { health: input.health, note },
    });
  });

  return { changed: true, health: input.health };
}

/**
 * Updates project basics. The key is not accepted: once issues exist, `KEY-number`
 * is a stable reference and is not rewritten here.
 */
export async function updateProject(ctx: AuthContext, rawInput: unknown): Promise<{ changed: boolean; key: string }> {
  const input = parseInput(updateProjectSchema, rawInput);
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, workspaceId: ctx.workspace.id, archivedAt: null },
    select: { id: true, key: true, name: true, description: true, status: true, targetDate: true },
  });
  if (!project) throw new NotFoundError("Project not found.");
  assertProjectPermission(ctx, "project.manage", project.id);

  const before = {
    name: project.name,
    description: project.description,
    status: project.status,
    targetDate: project.targetDate ? calendarDayUtc(project.targetDate) : null,
  };
  const after = {
    name: input.name,
    description: input.description,
    status: input.status,
    targetDate: input.targetDate ? calendarDayUtc(input.targetDate) : null,
  };
  const changedBefore: Record<string, string | null> = {};
  const changedAfter: Record<string, string | null> = {};
  for (const key of ["name", "description", "status", "targetDate"] as const) {
    if (before[key] === after[key]) continue;
    changedBefore[key] = before[key];
    changedAfter[key] = after[key];
  }
  if (Object.keys(changedAfter).length === 0) return { changed: false, key: project.key };

  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: project.id },
      data: {
        name: input.name,
        description: input.description,
        status: input.status,
        targetDate: input.targetDate,
      },
    });
    await recordActivity(tx, {
      workspaceId: ctx.workspace.id,
      actor: { type: "USER", userId: ctx.userId },
      action: "project.updated",
      entityType: "project",
      entityId: project.id,
      projectId: project.id,
      before: changedBefore,
      after: changedAfter,
    });
  });

  return { changed: true, key: project.key };
}

async function activeProject(ctx: AuthContext, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspace.id, archivedAt: null },
    select: { id: true, key: true },
  });
  if (!project) throw new NotFoundError("Project not found.");
  return project;
}

/** One lock for every membership change, so a transfer cannot pass a removal that already read the old role. */
async function lockProject(tx: Prisma.TransactionClient, projectId: string): Promise<void> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM projects WHERE id = ${projectId} FOR UPDATE
  `);
  if (rows.length !== 1) throw new NotFoundError("Project not found.");
}

async function assertCurrentLead(tx: Prisma.TransactionClient, projectId: string, userId: string): Promise<void> {
  const caller = await tx.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (caller?.role !== "LEAD") throw new ForbiddenError();
}

/** Adds an active workspace member. Project Lead only. The new person joins as a member, not a lead. */
export async function addProjectMember(ctx: AuthContext, rawInput: unknown): Promise<{ added: boolean }> {
  const input = parseInput(addProjectMemberSchema, rawInput);
  const project = await activeProject(ctx, input.projectId);
  assertProjectPermission(ctx, "project.manage", project.id);

  const person = await prisma.workspaceMember.findFirst({
    where: { workspaceId: ctx.workspace.id, userId: input.userId, user: { status: "ACTIVE" } },
    select: { userId: true },
  });
  if (!person) throw new ValidationError("Choose an active workspace member.", { userId: ["Unknown person."] });

  await prisma.$transaction(async (tx) => {
    await lockProject(tx, project.id);
    await assertCurrentLead(tx, project.id, ctx.userId);
    const existing = await tx.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: person.userId } },
      select: { userId: true },
    });
    if (existing) throw new ConflictError("This person is already on the project.");
    await tx.projectMember.create({
      data: { projectId: project.id, userId: person.userId, role: "MEMBER", addedById: ctx.userId },
    });
    const activityId = await recordActivity(tx, {
      workspaceId: ctx.workspace.id,
      actor: { type: "USER", userId: ctx.userId },
      action: "project.member_added",
      entityType: "project_member",
      entityId: `${project.id}:${person.userId}`,
      projectId: project.id,
      after: { userId: person.userId, role: "MEMBER" },
    });
    await notifyMembership(tx, {
      actorId: ctx.userId,
      projectId: project.id,
      userId: person.userId,
      role: "MEMBER",
      activityId,
    });
  });
  return { added: true };
}

/** Removes a member. The lead stays until the lead role is transferred. */
export async function removeProjectMember(ctx: AuthContext, rawInput: unknown): Promise<{ removed: boolean }> {
  const input = parseInput(removeProjectMemberSchema, rawInput);
  const project = await activeProject(ctx, input.projectId);
  assertProjectPermission(ctx, "project.manage", project.id);

  await prisma.$transaction(async (tx) => {
    await lockProject(tx, project.id);
    await assertCurrentLead(tx, project.id, ctx.userId);
    const member = await tx.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: input.userId } },
      select: { role: true, userId: true },
    });
    if (!member) throw new NotFoundError("That person is not on this project.");
    if (member.role === "LEAD") {
      throw new ValidationError("Transfer the lead role before removing this person.");
    }
    await tx.projectMember.delete({
      where: { projectId_userId: { projectId: project.id, userId: member.userId } },
    });
    await recordActivity(tx, {
      workspaceId: ctx.workspace.id,
      actor: { type: "USER", userId: ctx.userId },
      action: "project.member_removed",
      entityType: "project_member",
      entityId: `${project.id}:${member.userId}`,
      projectId: project.id,
      before: { userId: member.userId, role: member.role },
    });
  });
  return { removed: true };
}

/** Demotes the current lead and promotes an existing member in one transaction. */
export async function transferProjectLead(ctx: AuthContext, rawInput: unknown): Promise<{ changed: boolean }> {
  const input = parseInput(transferProjectLeadSchema, rawInput);
  const project = await activeProject(ctx, input.projectId);
  assertProjectPermission(ctx, "project.manage", project.id);

  const changed = await prisma.$transaction(async (tx) => {
    await lockProject(tx, project.id);
    await assertCurrentLead(tx, project.id, ctx.userId);
    const members = await tx.projectMember.findMany({
      where: { projectId: project.id },
      select: { userId: true, role: true },
    });
    const current = members.find((member) => member.role === "LEAD");
    const next = members.find((member) => member.userId === input.userId);
    if (!current) throw new ValidationError("This project has no lead.");
    if (!next) throw new ValidationError("Add the person to the project before making them lead.");
    if (current.userId === next.userId) return false;

    const active = await tx.user.findFirst({
      where: { id: next.userId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!active) throw new ValidationError("The new lead must be an active person.");

    await tx.projectMember.update({
      where: { projectId_userId: { projectId: project.id, userId: current.userId } },
      data: { role: "MEMBER" },
    });
    await tx.projectMember.update({
      where: { projectId_userId: { projectId: project.id, userId: next.userId } },
      data: { role: "LEAD" },
    });
    const activityId = await recordActivity(tx, {
      workspaceId: ctx.workspace.id,
      actor: { type: "USER", userId: ctx.userId },
      action: "project.lead_changed",
      entityType: "project_member",
      entityId: `${project.id}:${next.userId}`,
      projectId: project.id,
      before: { userId: current.userId, role: "LEAD" },
      after: { userId: next.userId, role: "LEAD" },
    });
    await notifyMembership(tx, {
      actorId: ctx.userId,
      projectId: project.id,
      userId: next.userId,
      role: "LEAD",
      activityId,
    });
    return true;
  });
  return { changed };
}

async function projectForAdmin(ctx: AuthContext, projectId: string) {
  assertWorkspacePermission(ctx, "admin.access");
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: ctx.workspace.id },
    select: { id: true, key: true, archivedAt: true },
  });
  if (!project) throw new NotFoundError("Project not found.");
  return project;
}

/** Hides a project from navigation, reports and day-to-day work. Admin only. Issues stay intact. */
export async function archiveProject(ctx: AuthContext, rawInput: unknown): Promise<{ changed: boolean; key: string }> {
  const input = parseInput(projectIdSchema, rawInput);
  const project = await projectForAdmin(ctx, input.projectId);
  if (project.archivedAt) return { changed: false, key: project.key };

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: project.id }, data: { archivedAt: new Date() } });
    await recordActivity(tx, {
      workspaceId: ctx.workspace.id,
      actor: { type: "USER", userId: ctx.userId },
      action: "project.archived",
      entityType: "project",
      entityId: project.id,
      projectId: project.id,
      after: { key: project.key },
    });
  });
  return { changed: true, key: project.key };
}

export async function restoreProject(ctx: AuthContext, rawInput: unknown): Promise<{ changed: boolean; key: string }> {
  const input = parseInput(projectIdSchema, rawInput);
  const project = await projectForAdmin(ctx, input.projectId);
  if (!project.archivedAt) return { changed: false, key: project.key };

  await prisma.$transaction(async (tx) => {
    await tx.project.update({ where: { id: project.id }, data: { archivedAt: null } });
    await recordActivity(tx, {
      workspaceId: ctx.workspace.id,
      actor: { type: "USER", userId: ctx.userId },
      action: "project.restored",
      entityType: "project",
      entityId: project.id,
      projectId: project.id,
      after: { key: project.key },
    });
  });
  return { changed: true, key: project.key };
}
