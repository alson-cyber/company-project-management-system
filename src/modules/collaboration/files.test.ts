import { describe, expect, test } from "vitest";
import {
  contentTypeFromDetection,
  defaultAttachmentDenylist,
  detectContentType,
  isDangerousAttachment,
  isInlineImage,
  sanitizeFilename,
  sha256Hex,
  storedContentType,
} from "@/modules/collaboration/files";

describe("attachment filenames and types", () => {
  test("drops paths and control characters", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("booking reference.png")).toBe("booking reference.png");
    expect(sanitizeFilename("a\u0000b.txt")).toBe("ab.txt");
    expect(sanitizeFilename("report\r\nSet-Cookie: x")).toBe("reportSet-Cookie_ x");
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

  test("rejects executable names and executable bytes, and hashes the content", async () => {
    const denylist = defaultAttachmentDenylist();
    const executable = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]);
    expect(
      isDangerousAttachment({
        filename: "setup.exe",
        declaredType: "application/octet-stream",
        detectedType: null,
        denylist,
      }),
    ).toBe(true);
    expect(
      isDangerousAttachment({
        filename: "notes.txt",
        declaredType: "text/plain",
        detectedType: detectContentType(executable),
        denylist,
      }),
    ).toBe(true);
    expect(
      isDangerousAttachment({
        filename: "photo.png",
        declaredType: "application/x-msdownload",
        detectedType: "image/png",
        denylist,
      }),
    ).toBe(true);
    expect(detectContentType(executable)).toBe("application/x-msdownload");
    expect(detectContentType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(contentTypeFromDetection(null)).toBe("application/octet-stream");
    expect(contentTypeFromDetection("image/png")).toBe("image/png");
    expect(
      isDangerousAttachment({
        filename: "script.bat",
        declaredType: "text/plain",
        detectedType: null,
        denylist: { extensions: new Set(["bat"]), mimeTypes: new Set() },
      }),
    ).toBe(true);
    expect(await sha256Hex(Uint8Array.from([1, 2, 3]))).toHaveLength(64);
  });
});
