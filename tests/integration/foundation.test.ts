import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/server/errors";
import { loadAuthContext } from "@/server/access/load-context";
import { seedDevelopmentData } from "@/modules/dev/dev-seed";
import { listExecutivePortfolio, listVisibleProjects, getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { createProject, setProjectHealth } from "@/modules/projects/project.service";
import { authContextFor, emails, resetDevelopmentSeed, testDb } from "./helpers";

beforeAll(async () => {
  await resetDevelopmentSeed();
});

afterAll(async () => {
  await testDb.$disconnect();
});

describe("development seed", () => {
  test("creates the expected users and projects", async () => {
    const workspace = await testDb.workspace.findFirstOrThrow();
    expect(await testDb.user.count()).toBeGreaterThanOrEqual(7);
    expect(
      await testDb.project.findUnique({
        where: { workspaceId_key: { workspaceId: workspace.id, key: "AQUA" } },
      }),
    ).toBeTruthy();
  });

  test("is safe to run twice", async () => {
    const password = process.env.SEED_DEV_PASSWORD ?? "workhub-dev-only-pass";
    const workspaceSlug = process.env.WORKSPACE_SLUG ?? "company";
    await seedDevelopmentData(testDb, { password, workspaceSlug });
    const users = await testDb.user.count();
    await seedDevelopmentData(testDb, { password, workspaceSlug });
    expect(await testDb.user.count()).toBe(users);
  });
});

describe("authorization of project reads", () => {
  test("a member only sees projects they belong to", async () => {
    const mika = await authContextFor(emails.designer);
    const visible = await listVisibleProjects(mika);
    expect(visible.map((project) => project.key).sort()).toEqual(["AQUA", "SV"]);
    expect(await getVisibleProjectByKey(mika, "AIB")).toBeNull();
  });

  test("an Executive sees every project", async () => {
    const executive = await authContextFor(emails.executive);
    const visible = await listVisibleProjects(executive);
    expect(visible.map((project) => project.key)).toEqual(expect.arrayContaining(["AIB", "AQUA", "PMS", "SV"]));
  });

  test("an Admin without membership does not see project content", async () => {
    const admin = await authContextFor(emails.admin);
    expect(await listVisibleProjects(admin)).toEqual([]);
    expect(await getVisibleProjectByKey(admin, "AQUA")).toBeNull();
  });

  test("an ordinary member cannot load the executive portfolio", async () => {
    const member = await authContextFor(emails.member);
    await expect(listExecutivePortfolio(member)).rejects.toBeInstanceOf(ForbiddenError);
  });

  test("a deactivated user has no auth context", async () => {
    const user = await testDb.user.findUniqueOrThrow({ where: { email: emails.deactivated } });
    const workspace = await testDb.workspace.findFirstOrThrow();
    expect(await loadAuthContext(testDb, user.id, workspace.slug)).toBeNull();
  });
});

describe("project mutations", () => {
  test("rejects invalid keys", async () => {
    const admin = await authContextFor(emails.admin);
    const lead = await testDb.user.findUniqueOrThrow({ where: { email: emails.lead } });
    await expect(
      createProject(admin, { key: "1BAD", name: "Broken", leadUserId: lead.id }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test("only an Admin can create a project, and they are not auto-added as a member", async () => {
    const admin = await authContextFor(emails.admin);
    const member = await authContextFor(emails.member);
    const lead = await testDb.user.findUniqueOrThrow({ where: { email: emails.lead } });

    await expect(
      createProject(member, { key: "NOPE", name: "Should fail", leadUserId: lead.id }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const key = `T${Date.now().toString(36).slice(-7).toUpperCase()}`;
    const created = await createProject(admin, {
      key,
      name: "New Project",
      leadUserId: lead.id,
      status: "PLANNING",
    });
    expect(created.key).toBe(key);

    const memberships = await testDb.projectMember.findMany({ where: { projectId: created.id } });
    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.userId).toBe(lead.id);
    expect(memberships[0]?.role).toBe("LEAD");
    expect(memberships.some((row) => row.userId === admin.userId)).toBe(false);

    const events = await testDb.activityEvent.findMany({ where: { projectId: created.id } });
    expect(events.map((event) => event.action).sort()).toEqual(["project.created", "project.member_added"]);
  });

  test("only the project lead can set health", async () => {
    const lead = await authContextFor(emails.lead);
    const member = await authContextFor(emails.member);
    const aqua = await getVisibleProjectByKey(lead, "AQUA");
    if (!aqua) throw new Error("AQUA missing");

    await expect(setProjectHealth(member, { projectId: aqua.id, health: "AT_RISK" })).rejects.toBeInstanceOf(
      ForbiddenError,
    );

    const nextHealth = aqua.health === "BLOCKED" ? "ATTENTION" : "BLOCKED";
    const result = await setProjectHealth(lead, { projectId: aqua.id, health: nextHealth, note: "Need a design review." });
    expect(result.changed).toBe(true);
    expect(result.health).toBe(nextHealth);

    const stored = await testDb.project.findUniqueOrThrow({ where: { id: aqua.id } });
    expect(stored.health).toBe(nextHealth);
    expect(stored.healthUpdatedById).toBe(lead.userId);
  });

  test("an unknown project looks like not found", async () => {
    const lead = await authContextFor(emails.lead);
    await expect(
      setProjectHealth(lead, { projectId: "00000000-0000-4000-8000-000000000000", health: "HEALTHY" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("activity immutability", () => {
  test("rejects updates and deletes on activity_events", async () => {
    const event = await testDb.activityEvent.findFirstOrThrow();
    await expect(
      testDb.activityEvent.update({ where: { id: event.id }, data: { action: "tampered" } }),
    ).rejects.toThrow(/append-only/);
    await expect(testDb.activityEvent.delete({ where: { id: event.id } })).rejects.toThrow(/append-only/);
  });
});
