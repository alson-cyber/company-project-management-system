import type { Env } from "@/server/env";
import { getEnv } from "@/server/env";

export interface AttachmentPolicy {
  /** Maximum size of a single attachment in bytes (ATTACHMENT_MAX_BYTES, default 25 MB). */
  maxBytes: number;
}

export function attachmentPolicyFrom(env: Env): AttachmentPolicy {
  return { maxBytes: env.ATTACHMENT_MAX_BYTES };
}

/** The single source of the attachment limit; do not hard-code the value elsewhere. */
export function getAttachmentPolicy(): AttachmentPolicy {
  return attachmentPolicyFrom(getEnv());
}

export function isWithinAttachmentLimit(policy: AttachmentPolicy, sizeBytes: number): boolean {
  return Number.isInteger(sizeBytes) && sizeBytes >= 0 && sizeBytes <= policy.maxBytes;
}
