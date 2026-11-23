import type { Env } from "@/server/env";
import { getEnv } from "@/server/env";

export interface AttachmentPolicy {
  /** Maximum size of a single attachment in bytes (ATTACHMENT_MAX_BYTES, default 25 MB). */
  maxBytes: number;
  /** Extensions refused on upload (ATTACHMENT_DANGEROUS_EXTENSIONS). */
  dangerousExtensions: ReadonlySet<string>;
  /** MIME types refused for both the client declaration and the detected bytes. */
  dangerousMimeTypes: ReadonlySet<string>;
}

export function attachmentPolicyFrom(env: Env): AttachmentPolicy {
  return {
    maxBytes: env.ATTACHMENT_MAX_BYTES,
    dangerousExtensions: new Set(env.ATTACHMENT_DANGEROUS_EXTENSIONS),
    dangerousMimeTypes: new Set(env.ATTACHMENT_DANGEROUS_MIME_TYPES),
  };
}

/** The single source of the attachment limit; do not hard-code the value elsewhere. */
export function getAttachmentPolicy(): AttachmentPolicy {
  return attachmentPolicyFrom(getEnv());
}

export function isWithinAttachmentLimit(policy: Pick<AttachmentPolicy, "maxBytes">, sizeBytes: number): boolean {
  return Number.isInteger(sizeBytes) && sizeBytes >= 0 && sizeBytes <= policy.maxBytes;
}
