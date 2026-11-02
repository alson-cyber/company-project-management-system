import Link from "next/link";
import { cn } from "@/components/ui/cn";

export type StatTone = "neutral" | "danger" | "warning" | "info" | "success" | "purple";
export type StatIcon =
  "folder" | "stack" | "alert" | "flag" | "eye" | "check" | "clock" | "bell" | "chart" | "people";

const toneStyles: Record<StatTone, { chip: string; value: string }> = {
  neutral: { chip: "bg-surface-3 text-muted", value: "text-ink" },
  danger: { chip: "bg-danger-soft text-danger", value: "text-danger" },
  warning: { chip: "bg-warning-soft text-warning", value: "text-warning" },
  info: { chip: "bg-info-soft text-info", value: "text-info" },
  success: { chip: "bg-success-soft text-success", value: "text-success" },
  purple: { chip: "bg-purple-soft text-purple", value: "text-purple" },
};

const paths: Record<StatIcon, React.ReactNode> = {
  folder: <path d="M2.5 4.5a1 1 0 0 1 1-1h3l1.5 1.5h4.5a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" />,
  stack: <path d="M8 2.5 13.5 5 8 7.5 2.5 5zM2.5 8 8 10.5 13.5 8M2.5 11 8 13.5 13.5 11" />,
  alert: <path d="M8 2.5 14 13H2zM8 6.5v3M8 11.2v.1" />,
  flag: <path d="M3.5 13.5v-11M3.5 3h8l-1.8 3 1.8 3h-8" />,
  eye: (
    <path d="M1.8 8S4 3.8 8 3.8 14.2 8 14.2 8 12 12.2 8 12.2 1.8 8 1.8 8zM8 9.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z" />
  ),
  check: <path d="m3 8.5 3 3 7-7" />,
  clock: <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 5v3.2l2 1.3" />,
  bell: <path d="M4 11.5V7.5a4 4 0 0 1 8 0v4l1 1H3zM6.5 13.5a1.5 1.5 0 0 0 3 0" />,
  chart: <path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5" />,
  people: (
    <path d="M6 7.5a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6zM1.8 13.5c.4-2.3 2.1-3.7 4.2-3.7s3.8 1.4 4.2 3.7M10.8 7.3a2 2 0 1 0-.6-3.9M11.5 9.9c1.5.3 2.5 1.6 2.8 3.6" />
  ),
};

/**
 * One metric in its own block: a coloured icon chip, a label, a large number and a short hint.
 * `emphasise` colours the number (for example, overdue work when the count is above zero).
 */
export function StatTile({
  label,
  value,
  hint,
  href,
  icon,
  tone = "neutral",
  emphasise = false,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  icon: StatIcon;
  tone?: StatTone;
  emphasise?: boolean;
}) {
  const style = toneStyles[tone];
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <span
          className={cn("grid size-8 shrink-0 place-items-center rounded-lg", style.chip)}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {paths[icon]}
          </svg>
        </span>
        <span className="min-w-0 truncate text-[13px] font-medium text-muted">{label}</span>
      </div>
      <p
        className={cn(
          "mt-3 text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums",
          emphasise ? style.value : "text-ink",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 truncate text-xs text-muted">{hint}</p> : null}
    </>
  );
  const className =
    "block rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card transition-[box-shadow,border-color]";
  if (!href) return <div className={className}>{body}</div>;
  return (
    <Link href={href} className={cn(className, "hover:border-line-strong hover:shadow-lift")}>
      {body}
    </Link>
  );
}

/** A responsive grid that keeps tiles apart with clear gaps. */
export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4", className)}>
      {children}
    </div>
  );
}
