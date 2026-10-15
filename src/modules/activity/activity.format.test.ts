import { describe, expect, test } from "vitest";
import { describeActivity } from "@/modules/activity/activity.format";

describe("describeActivity", () => {
  test("renders a health change from structured before/after values", () => {
    expect(
      describeActivity({
        id: "1",
        occurredAt: new Date(),
        action: "project.health_changed",
        actorName: "Sarah",
        before: { health: "HEALTHY" },
        after: { health: "AT_RISK" },
      }),
    ).toBe("changed health from Healthy to At risk");
  });

  test("renders issue creation and status changes from structured values", () => {
    expect(
      describeActivity({
        id: "1",
        occurredAt: new Date(),
        action: "issue.created",
        actorName: "Alex",
        before: null,
        after: { type: "EPIC", key: "AQUA-1" },
      }),
    ).toBe("created Epic AQUA-1");
    expect(
      describeActivity({
        id: "2",
        occurredAt: new Date(),
        action: "issue.updated",
        actorName: "Alex",
        before: { status: "TO_DO" },
        after: { status: "DONE" },
      }),
    ).toBe("changed status from To Do to Done");
  });

  test("does not invent wording for unknown actions", () => {
    expect(
      describeActivity({
        id: "1",
        occurredAt: new Date(),
        action: "not.a.real.action",
        actorName: "Alex",
        before: null,
        after: null,
      }),
    ).toBe("not.a.real.action");
  });
});
