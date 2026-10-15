/** Accepts only same-origin relative paths, so `?next=` cannot redirect off-site. */
export function safeRedirectPath(value: string | null | undefined, fallback = "/start"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/api/")) return fallback;
  return value;
}
