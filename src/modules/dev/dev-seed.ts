import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Database } from "@/server/db";
import { SEED_PROJECTS, SEED_USERS, SEED_WORKSPACE, type SeedProject, type SeedUser } from "@/modules/dev/dev-fixtures";
import { seedProjectIssueTrees } from "@/modules/dev/seed-issues";

export interface SeedSummary {
  workspaceId: string;
  users: number;
  projects: number;
  memberships: number;
  projectsCreated: number;
  issuesCreated: number;
}

export async function seedDevelopmentData(
  db: Database,
  options: { password: string; workspaceSlug?: string },
): Promise<SeedSummary> {
  if (options.password.length < 12) throw new Error("Seed password must be at least 12 characters.");
  const passwordHash = await hashPassword(options.password);
  const slug = options.workspaceSlug ?? SEED_WORKSPACE.defaultSlug;

  const workspace = await db.workspace.upsert({
    where: { slug },
    create: { slug, name: SEED_WORKSPACE.name },
    update: {},
  });

  const userIds = new Map<string, string>();
  for (const seedUser of SEED_USERS as readonly SeedUser[]) {
    const user = await db.user.upsert({
      where: { email: seedUser.email },
      create: {
        id: randomUUID(),
        name: seedUser.name,
        email: seedUser.email,
        emailVerified: true,
        jobTitle: seedUser.jobTitle,
        status: seedUser.status ?? "ACTIVE",
      },
      update: { name: seedUser.name, jobTitle: seedUser.jobTitle, status: seedUser.status ?? "ACTIVE" },
    });
    userIds.set(seedUser.email, user.id);

    // Better Auth stores email/password credentials as an account with providerId "credential".
    const credential = await db.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    if (credential) {
      await db.account.update({ where: { id: credential.id }, data: { password: passwordHash } });
    } else {
      await db.account.create({
        data: { id: randomUUID(), userId: user.id, accountId: user.id, providerId: "credential", password: passwordHash },
      });
    }

    await db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      create: { workspaceId: workspace.id, userId: user.id },
      update: {},
    });

    await db.workspaceRoleGrant.deleteMany({
      where: { workspaceId: workspace.id, userId: user.id, role: { notIn: seedUser.workspaceRoles } },
    });
    for (const role of seedUser.workspaceRoles) {
      await db.workspaceRoleGrant.upsert({
        where: { workspaceId_userId_role: { workspaceId: workspace.id, userId: user.id, role } },
        create: { workspaceId: workspace.id, userId: user.id, role },
        update: {},
      });
    }
  }

  const adminId = userIds.get("omar.haleem@workhub.test");
  if (!adminId) throw new Error("Seed admin user missing.");

  let memberships = 0;
  let projectsCreated = 0;
  for (const seedProject of SEED_PROJECTS as readonly SeedProject[]) {
    const existing = await db.project.findUnique({
      where: { workspaceId_key: { workspaceId: workspace.id, key: seedProject.key } },
      select: { id: true },
    });
    const data = {
      name: seedProject.name,
      description: seedProject.description,
      status: seedProject.status,
      color: seedProject.color,
      targetDate: new Date(`${seedProject.targetDate}T00:00:00.000Z`),
    };

    const project = existing
      ? await db.project.update({ where: { id: existing.id }, data, select: { id: true } })
      : await db.$transaction(async (tx) => {
          const created = await tx.project.create({
            data: { ...data, workspaceId: workspace.id, key: seedProject.key, createdById: adminId },
            select: { id: true },
          });
          await tx.activityEvent.create({
            data: {
              workspaceId: workspace.id,
              actorType: "SYSTEM",
              action: "project.created",
              entityType: "project",
              entityId: created.id,
              projectId: created.id,
              after: { key: seedProject.key, name: seedProject.name, status: seedProject.status },
              metadata: { source: "development-seed" },
            },
          });
          return created;
        });
    if (!existing) projectsCreated += 1;

    await db.$transaction(async (tx) => {
      await tx.projectMember.deleteMany({ where: { projectId: project.id } });
      await tx.projectMember.createMany({
        data: seedProject.members.map((member) => {
          const userId = userIds.get(member.email);
          if (!userId) throw new Error(`Unknown seed member ${member.email}`);
          return { projectId: project.id, userId, role: member.role, addedById: adminId };
        }),
      });
    });
    memberships += seedProject.members.length;
  }

  const issues = await seedProjectIssueTrees(db, { workspaceId: workspace.id, userIds });

  return {
    workspaceId: workspace.id,
    users: SEED_USERS.length,
    projects: SEED_PROJECTS.length,
    memberships,
    projectsCreated,
    issuesCreated: issues.issuesCreated,
  };
}
