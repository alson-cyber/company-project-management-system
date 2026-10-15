import { describe, expect, test } from "vitest";
import { buildNavigation, isActivePath } from "@/components/shell/navigation";

describe("buildNavigation", () => {
  test("hides Executive and Administration unless granted", () => {
    const nav = buildNavigation({ canViewExecutive: false, canAdminister: false, projects: [] });
    expect(nav.management).toEqual([]);
  });

  test("shows Executive only to executives", () => {
    const nav = buildNavigation({ canViewExecutive: true, canAdminister: false, projects: [] });
    expect(nav.management.map((item) => item.href)).toEqual(["/executive"]);
  });

  test("keeps Administration conceptually separate from Executive", () => {
    const nav = buildNavigation({ canViewExecutive: true, canAdminister: true, projects: [] });
    expect(nav.management.map((item) => item.href)).toEqual(["/executive", "/admin"]);
  });
});

describe("isActivePath", () => {
  test("treats dashboard as exact match only", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/projects", "/")).toBe(false);
  });

  test("matches nested project routes", () => {
    expect(isActivePath("/projects/AQUA", "/projects")).toBe(true);
  });
});
