const INLINE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const DANGEROUS_EXTENSIONS = new Set([
  "exe",
  "dll",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "ps1",
  "vbs",
  "jar",
  "apk",
  "dmg",
  "app",
]);

const DANGEROUS_TYPES = new Set([
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-executable",
  "application/x-dosexec",
  "application/vnd.microsoft.portable-executable",
  "application/x-sh",
  "application/x-mach-binary",
  "application/java-archive",
  "application/vnd.android.package-archive",
]);

const UNSAFE_TYPES = new Set(["text/html", "image/svg+xml", "application/xhtml+xml", "application/javascript", "text/javascript"]);

/** Basename only, with control characters removed. Never used as a storage key. */
export function sanitizeFilename(input: string): string {
  const base = input.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/^[.\s]+/, "")
    .trim()
    .slice(0, 180);
  return cleaned.length > 0 ? cleaned : "file";
}

/** Stores a declared type only when it is a simple token. HTML, SVG, and script types become opaque bytes. */
export function storedContentType(input: string): string {
  const base = input.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(base)) return "application/octet-stream";
  if (UNSAFE_TYPES.has(base)) return "application/octet-stream";
  return base;
}

export function isInlineImage(contentType: string): boolean {
  return INLINE_IMAGE_TYPES.has(contentType);
}

export function fileExtension(filename: string): string {
  const base = sanitizeFilename(filename);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot + 1).toLowerCase();
}

export interface AttachmentDenylist {
  extensions: ReadonlySet<string>;
  mimeTypes: ReadonlySet<string>;
}

export const DEFAULT_DANGEROUS_EXTENSIONS = [...DANGEROUS_EXTENSIONS];
export const DEFAULT_DANGEROUS_MIME_TYPES = [...DANGEROUS_TYPES];

export function defaultAttachmentDenylist(): AttachmentDenylist {
  return { extensions: DANGEROUS_EXTENSIONS, mimeTypes: DANGEROUS_TYPES };
}

/** Lower-case type without parameters. An unusable token is empty and is not stored. */
export function normalizeMimeType(input: string): string {
  const base = input.split(";")[0]?.trim().toLowerCase() ?? "";
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(base) ? base : "";
}

/**
 * The stored type is the type detected from the bytes.
 * When detection is inconclusive the record is opaque bytes, never the client's declaration.
 */
export function contentTypeFromDetection(detected: string | null): string {
  return detected ?? "application/octet-stream";
}

export function isDangerousAttachment(input: {
  filename: string;
  declaredType: string;
  detectedType: string | null;
  denylist: AttachmentDenylist;
}): boolean {
  if (input.denylist.extensions.has(fileExtension(input.filename))) return true;
  const declared = normalizeMimeType(input.declaredType);
  if (declared && input.denylist.mimeTypes.has(declared)) return true;
  return input.detectedType !== null && input.denylist.mimeTypes.has(input.detectedType);
}

/** Best-effort type from the first bytes. Unknown content stays opaque. */
export function detectContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) return "application/x-msdownload";
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "application/zip";
  return null;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${Math.max(0, Math.round(bytes))} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / (1024 * 102.4)) / 10} MB`;
}

export function attachmentLimitLabel(maxBytes: number): string {
  const megabytes = maxBytes / (1024 * 1024);
  if (Number.isInteger(megabytes)) return `${megabytes} MB`;
  return `${megabytes.toFixed(1)} MB`;
}
