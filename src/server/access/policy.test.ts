import { describe, expect, test } from "vitest";
import {
  assertProjectPermission,
  assertWorkspacePermission,
  hasProjectPermission,
  hasWorkspacePermission,
} from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";
import { ForbiddenError, NotFoundError } from "@/server/errors";

function ctx(overrides: Partial<AuthContext> & Pick<AuthContext, "workspaceRoles" | "projectRoles">): AuthContext {
  return {
    userId: "user-1",
    user: { id: "user-1", name: "Test", email: "test@workhub.test", jobTitle: null, image: null },
    workspace: { id: "ws-1", slug: "company", name: "Company" },
    ...overrides,
  };
}

const aqua = "project-aqua";
const other = "project-other";

describe("workspace permissions", () => {
  test("Executive can view the executive area and cannot administer", () => {
    const executive = ctx({ workspaceRoles: new Set(["EXECUTIVE"]), projectRoles: new Map() });
    expect(hasWorkspacePermission(executive, "executive.view")).toBe(true);
    expect(hasWorkspacePermission(executive, "admin.access")).toBe(false);
    expect(hasWorkspacePermission(executive, "project.create")).toBe(false);
  });

  test("Admin can administer and cannot view the executive area", () => {
    const admin = ctx({ workspaceRoles: new Set(["ADMIN"]), projectRoles: new Map() });
    expect(hasWorkspacePermission(admin, "admin.access")).toBe(true);
    expect(hasWorkspacePermission(admin, "project.create")).toBe(true);
    expect(hasWorkspacePermission(admin, "executive.view")).toBe(false);
  });

  test("a plain member has neither system grant", () => {
    const member = ctx({ workspaceRoles: new Set(), projectRoles: new Map([[aqua, "MEMBER"]]) });
    expect(hasWorkspacePermission(member, "executive.view")).toBe(false);
    expect(hasWorkspacePermission(member, "admin.access")).toBe(false);
  });
});

describe("project permissions", () => {
  test("members can view and participate in their own project only", () => {
    const member = ctx({ workspaceRoles: new Set(), projectRoles: new Map([[aqua, "MEMBER"]]) });
    expect(hasProjectPermission(member, "project.view", aqua)).toBe(true);
    expect(hasProjectPermission(member, "project.participate", aqua)).toBe(true);
    expect(hasProjectPermission(member, "project.health.set", aqua)).toBe(false);
    expect(hasProjectPermission(member, "project.view", other)).toBe(false);
  });

  test("project leads can set health on their project", () => {
    const lead = ctx({ workspaceRoles: new Set(), projectRoles: new Map([[aqua, "LEAD"]]) });
    expect(hasProjectPermission(lead, "project.health.set", aqua)).toBe(true);
    expect(hasProjectPermission(lead, "project.manage", aqua)).toBe(true);
  });

  test("Executives can view every project but cannot participate without membership", () => {
    const executive = ctx({ workspaceRoles: new Set(["EXECUTIVE"]), projectRoles: new Map() });
    expect(hasProjectPermission(executive, "project.view", aqua)).toBe(true);
    expect(hasProjectPermission(executive, "project.participate", aqua)).toBe(false);
    expect(hasProjectPermission(executive, "project.health.set", aqua)).toBe(false);
  });

  test("Admins cannot view project content without membership", () => {
    const admin = ctx({ workspaceRoles: new Set(["ADMIN"]), projectRoles: new Map() });
    expect(hasProjectPermission(admin, "project.view", aqua)).toBe(false);
    expect(hasProjectPermission(admin, "project.participate", aqua)).toBe(false);
  });

  test("an Executive who is also a member can participate", () => {
    const executiveMember = ctx({
      workspaceRoles: new Set(["EXECUTIVE"]),
      projectRoles: new Map([[aqua, "MEMBER"]]),
    });
    expect(hasProjectPermission(executiveMember, "project.participate", aqua)).toBe(true);
  });
});

describe("assertion errors", () => {
  test("unknown projects look like not-found rather than forbidden", () => {
    const member = ctx({ workspaceRoles: new Set(), projectRoles: new Map([[aqua, "MEMBER"]]) });
    expect(() => assertProjectPermission(member, "project.view", other)).toThrow(NotFoundError);
    expect(() => assertProjectPermission(member, "project.health.set", aqua)).toThrow(ForbiddenError);
  });

  test("missing workspace permission is forbidden", () => {
    const member = ctx({ workspaceRoles: new Set(), projectRoles: new Map() });
    expect(() => assertWorkspacePermission(member, "executive.view")).toThrow(ForbiddenError);
  });
});
