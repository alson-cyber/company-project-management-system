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

  test("does not invent wording for unknown actions", () => {
    expect(
      describeActivity({
        id: "1",
        occurredAt: new Date(),
        action: "issue.created",
        actorName: "Alex",
        before: null,
        after: null,
      }),
    ).toBe("issue.created");
  });
});
