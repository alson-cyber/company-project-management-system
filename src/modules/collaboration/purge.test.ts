import { describe, expect, test } from "vitest";
import { runAttachmentPurge, type PurgeLedger, type PurgeRequest } from "@/modules/collaboration/purge";

function memoryLedger(): PurgeLedger & { audits: number; cleaned: boolean; failMark: boolean } {
  let requested = false;
  const ledger = {
    audits: 0,
    cleaned: false,
    failMark: false,
    async request(): Promise<PurgeRequest> {
      if (ledger.cleaned) return { state: "done" };
      if (!requested) {
        requested = true;
        ledger.audits += 1;
      }
      return { state: "pending", objectKey: "attachments/issue/file" };
    },
    async markCleaned(): Promise<void> {
      if (ledger.failMark) {
        ledger.failMark = false;
        throw new Error("database unavailable");
      }
      ledger.cleaned = true;
    },
  };
  return ledger;
}

describe("attachment purge recovery", () => {
  test("a storage failure keeps the audit and a retry deletes the object once", async () => {
    const ledger = memoryLedger();
    let deleted = 0;
    const storage = {
      async delete(): Promise<void> {
        deleted += 1;
        if (deleted === 1) throw new Error("storage unavailable");
      },
    };
    await expect(runAttachmentPurge(ledger, storage, "file")).rejects.toThrow(/storage/);
    expect(ledger.audits).toBe(1);
    expect(ledger.cleaned).toBe(false);
    await runAttachmentPurge(ledger, storage, "file");
    expect(deleted).toBe(2);
    expect(ledger.audits).toBe(1);
    expect(ledger.cleaned).toBe(true);
    await runAttachmentPurge(ledger, storage, "file");
    expect(ledger.audits).toBe(1);
    expect(deleted).toBe(2);
  });

  test("a database failure after deletion is finished by the next request without a second audit", async () => {
    const ledger = memoryLedger();
    ledger.failMark = true;
    let deleted = 0;
    const storage = {
      async delete(): Promise<void> {
        deleted += 1;
      },
    };
    await expect(runAttachmentPurge(ledger, storage, "file")).rejects.toThrow(/database/);
    expect(ledger.audits).toBe(1);
    expect(ledger.cleaned).toBe(false);
    await runAttachmentPurge(ledger, storage, "file");
    expect(ledger.audits).toBe(1);
    expect(ledger.cleaned).toBe(true);
    expect(deleted).toBe(2);
    await runAttachmentPurge(ledger, storage, "file");
    expect(ledger.audits).toBe(1);
    expect(deleted).toBe(2);
  });
});
