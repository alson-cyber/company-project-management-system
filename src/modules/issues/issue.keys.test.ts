import { describe, expect, test } from "vitest";
import { issueKey, parseIssueKey } from "@/modules/issues/issue.keys";

describe("issue keys", () => {
  test("are flat project-local numbers", () => {
    expect(issueKey("AQUA", 1)).toBe("AQUA-1");
    expect(issueKey("SV", 24)).toBe("SV-24");
    expect(parseIssueKey("AQUA-111-2")).toBeNull();
    expect(parseIssueKey("aqua-12")).toEqual({ projectKey: "AQUA", number: 12 });
    expect(parseIssueKey("AQUA-0")).toBeNull();
  });
});
