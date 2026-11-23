/**
 * Purge is two committed steps. The audit is durable before any byte is deleted.
 * A later failure leaves a request that the next call can finish, without a second audit.
 */
export interface PurgeRequest {
  state: "done" | "pending";
  objectKey?: string;
}

export interface PurgeLedger {
  /** Locks the attachment, records the request and its audit once, and commits. */
  request(attachmentId: string): Promise<PurgeRequest>;
  /** Marks cleanup complete after storage deletion has succeeded. */
  markCleaned(attachmentId: string): Promise<void>;
}

export async function runAttachmentPurge(
  ledger: PurgeLedger,
  storage: { delete(key: string): Promise<void> },
  attachmentId: string,
): Promise<{ purged: boolean }> {
  const request = await ledger.request(attachmentId);
  if (request.state === "done") return { purged: false };
  if (!request.objectKey) throw new Error("A pending purge is missing its storage key.");
  await storage.delete(request.objectKey);
  await ledger.markCleaned(attachmentId);
  return { purged: true };
}
