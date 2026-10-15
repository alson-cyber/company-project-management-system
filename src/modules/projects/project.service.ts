import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { ProjectHealth } from "@/generated/prisma/enums";
import { recordActivity } from "@/modules/activity/activity.service";
import { PROJECT_COLORS } from "@/modules/projects/project.constants";
import { createProjectSchema, setProjectHealthSchema, updateProjectSchema } from "@/modules/projects/project.schema";
import { calendarDayUtc } from "@/lib/calendar";
import { prisma } from "@/server/db";
import { ConflictError, NotFoundError, ValidationError, parseInput } from "@/server/errors";
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
      await recordActivity(tx, {
        workspaceId: ctx.workspace.id,
        actor,
        action: "project.member_added",
        entityType: "project_member",
        entityId: `${project.id}:${lead.userId}`,
        projectId: project.id,
        after: { userId: lead.userId, role: "LEAD" },
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
