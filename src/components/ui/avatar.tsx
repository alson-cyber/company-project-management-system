import { cn } from "@/components/ui/cn";

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-[#dfe7ff] font-semibold text-accent-strong",
        size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
