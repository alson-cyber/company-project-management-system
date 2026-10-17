import { describe, expect, test } from "vitest";
import { managementSignals } from "@/modules/reporting/attention.rules";

const base = {
  health: null,
  status: "ACTIVE" as const,
  targetDate: "2026-12-01",
  today: "2026-10-17",
  overdueExecutable: 0,
  highestOverdue: 0,
  openExecutable: 1,
  inReviewExecutable: 0,
  stalledExecutable: 0,
};

describe("management attention", () => {
  test("does not invent a signal for a healthy quiet project", () => {
    expect(managementSignals({ ...base, health: "HEALTHY" })).toEqual([]);
  });

  test("explains overdue Highest work and a cluster separately", () => {
    const signals = managementSignals({ ...base, overdueExecutable: 4, highestOverdue: 1 });
    expect(signals.map((signal) => signal.kind)).toEqual(["highest_overdue", "overdue_cluster"]);
    expect(signals[0]?.text).toBe("1 overdue Highest-priority item");
    expect(signals[1]?.text).toBe("4 overdue executable items");
  });

  test("flags an approaching target only when open work is substantial", () => {
    expect(managementSignals({ ...base, targetDate: "2026-10-26", openExecutable: 2 })).toEqual([]);
    const [signal] = managementSignals({ ...base, targetDate: "2026-10-26", openExecutable: 3 });
    expect(signal?.kind).toBe("target_approaching");
    expect(signal?.text).toContain("9 days");
  });

  test("repeats a lead-set At risk or Blocked label without calculating health", () => {
    expect(managementSignals({ ...base, health: "AT_RISK" })[0]?.text).toBe("Project lead marked this At risk");
    expect(managementSignals({ ...base, health: "BLOCKED" })[0]?.text).toBe("Project lead marked this Blocked");
  });

  test("flags an active project whose target has already passed", () => {
    const [signal] = managementSignals({ ...base, targetDate: "2026-10-01" });
    expect(signal?.kind).toBe("target_passed");
  });

  test("defines stalled work as no update for 14 days", () => {
    const [signal] = managementSignals({ ...base, stalledExecutable: 2 });
    expect(signal?.text).toBe("2 open executable items have had no update for 14 days");
  });
});
