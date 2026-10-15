import { describe, expect, test } from "vitest";
import { isInlineImage, sanitizeFilename, storedContentType } from "@/modules/collaboration/files";

describe("attachment filenames and types", () => {
  test("drops paths and control characters", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("booking reference.png")).toBe("booking reference.png");
    expect(sanitizeFilename("a\u0000b.txt")).toBe("ab.txt");
    expect(sanitizeFilename("   ")).toBe("file");
    expect(sanitizeFilename("x".repeat(400))).toHaveLength(180);
  });

  test("does not treat html or svg as something the browser should render", () => {
    expect(storedContentType("text/html")).toBe("application/octet-stream");
    expect(storedContentType("image/svg+xml")).toBe("application/octet-stream");
    expect(storedContentType("image/png")).toBe("image/png");
    expect(storedContentType("not a type")).toBe("application/octet-stream");
    expect(isInlineImage("image/png")).toBe(true);
    expect(isInlineImage("image/svg+xml")).toBe(false);
    expect(isInlineImage("application/pdf")).toBe(false);
  });
});
