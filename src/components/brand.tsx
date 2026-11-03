import { cn } from "@/components/ui/cn";

export function BrandMark({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-grid size-8 shrink-0 place-items-center rounded-[9px] text-[13px] font-extrabold",
        inverted ? "bg-accent text-on-accent" : "bg-accent text-on-accent",
        className,
      )}
    >
      W
    </span>
  );
}
