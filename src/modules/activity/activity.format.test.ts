import { describe, expect, test } from "vitest";
import { activityDetail, describeActivity } from "@/modules/activity/activity.format";

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
    expect(
      describeActivity({
        id: "3",
        occurredAt: new Date(),
        action: "issue.updated",
        actorName: "Alson",
        before: { assigneeId: "a", assigneeName: "Sarah Kim" },
        after: { assigneeId: "b", assigneeName: "Alex Noor" },
      }),
    ).toBe("changed the assignee from Sarah Kim to Alex Noor");
    expect(
      describeActivity({
        id: "4",
        occurredAt: new Date(),
        action: "issue.attachment_added",
        actorName: "Mika",
        before: null,
        after: { filename: "booking-reference.png" },
      }),
    ).toBe("uploaded booking-reference.png");
    expect(
      activityDetail({
        id: "2",
        occurredAt: new Date(),
        action: "issue.updated",
        actorName: "Sarah",
        before: { status: "TO_DO" },
        after: { status: "IN_PROGRESS" },
      }),
    ).toBe("To Do → In Progress");
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
