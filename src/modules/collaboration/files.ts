const INLINE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

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
