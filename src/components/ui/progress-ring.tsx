import { cn } from "@/components/ui/cn";

/**
 * A small circular progress indicator. The ring turns green and shows a check when
 * everything is done, so finished work is visible at a glance.
 */
export function ProgressRing({
  percent,
  size = 18,
  stroke,
  showLabel = false,
  className,
  label,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  /** Show the percentage next to the ring. */
  showLabel?: boolean;
  className?: string;
  /** Accessible description, for example "3 of 4 done". */
  label?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const width = stroke ?? Math.max(2, Math.round(size / 8));
  const radius = (size - width) / 2;
  const circumference = 2 * Math.PI * radius;
  const complete = value >= 100;

  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5", className)}
      role="img"
      aria-label={label ?? `${value}% complete`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={width}
          className="stroke-surface-3"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className={cn(
            "transition-[stroke-dashoffset] duration-700 ease-out",
            complete ? "stroke-success" : value > 0 ? "stroke-success/80" : "stroke-transparent",
          )}
        />
        {complete && size >= 16 ? (
          <path
            d={`M${size * 0.32} ${size * 0.5} l${size * 0.12} ${size * 0.12} l${size * 0.24} -${size * 0.26}`}
            fill="none"
            strokeWidth={Math.max(1.5, width * 0.8)}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="rotate-90 stroke-success"
            style={{ transformOrigin: "center" }}
          />
        ) : null}
      </svg>
      {showLabel ? <span className="text-xs tabular-nums text-muted">{value}%</span> : null}
    </span>
  );
}
