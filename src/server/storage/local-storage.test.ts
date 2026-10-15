import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { LocalFilesystemStorage } from "@/server/storage/local-storage";

describe("LocalFilesystemStorage", () => {
  let root = "";

  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  test("round-trips an object and refuses path traversal", async () => {
    root = await mkdtemp(path.join(tmpdir(), "workhub-storage-"));
    const storage = new LocalFilesystemStorage(root);
    await storage.put("attachments/demo.bin", Buffer.from("hello"), { contentType: "text/plain" });
    const info = await storage.head("attachments/demo.bin");
    expect(info?.size).toBe(5);
    expect(info?.contentType).toBe("text/plain");
    await expect(storage.put("../escape.bin", Buffer.from("nope"), { contentType: "text/plain" })).rejects.toThrow();
    await storage.delete("attachments/demo.bin");
    expect(await storage.head("attachments/demo.bin")).toBeNull();
  });
});
