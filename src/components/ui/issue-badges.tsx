import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";
import { Badge, type Tone } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/modules/issues/issue.constants";

/**
 * One colour per level of the hierarchy, used everywhere an issue appears:
 * Epic = violet, User Story = green, Task = blue, Sub-task = orange.
 * Each type also has its own icon shape, so the colour is never the only signal.
 * Class names are written out in full so Tailwind can find them.
 */
export const ISSUE_TYPE_STYLES: Record<
  IssueType,
  { solid: string; text: string; soft: string; stripe: string; bar: string }
> = {
  EPIC: {
    solid: "bg-epic",
    text: "text-epic-ink",
    soft: "bg-epic-soft",
    stripe: "border-l-epic",
    bar: "bg-epic/80",
  },
  USER_STORY: {
    solid: "bg-story",
    text: "text-story-ink",
    soft: "bg-story-soft",
    stripe: "border-l-story",
    bar: "bg-story/80",
  },
  TASK: {
    solid: "bg-task",
    text: "text-task-ink",
    soft: "bg-task-soft",
    stripe: "border-l-task",
    bar: "bg-task/80",
  },
  SUB_TASK: {
    solid: "bg-subtask",
    text: "text-subtask-ink",
    soft: "bg-subtask-soft",
    stripe: "border-l-subtask",
    bar: "bg-subtask/80",
  },
};

/** Short labels for tight spaces such as board cards and the legend. */
export const ISSUE_TYPE_SHORT_LABELS: Record<IssueType, string> = {
  EPIC: "Epic",
  USER_STORY: "Story",
  TASK: "Task",
  SUB_TASK: "Sub-task",
};

export const ISSUE_TYPE_ORDER: readonly IssueType[] = ["EPIC", "USER_STORY", "TASK", "SUB_TASK"];

/** A small coloured square with a white glyph: lightning (Epic), bookmark (Story), check (Task), nested square (Sub-task). */
export function IssueTypeIcon({
  type,
  size = "md",
  className,
  labelled = true,
}: {
  type: IssueType;
  size?: "sm" | "md";
  className?: string;
  /** When false the icon is decorative (a visible label sits next to it). */
  labelled?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-[4px] text-white",
        size === "sm" ? "size-3.5" : "size-[18px]",
        ISSUE_TYPE_STYLES[type].solid,
        className,
      )}
      title={labelled ? ISSUE_TYPE_LABELS[type] : undefined}
    >
      <svg viewBox="0 0 16 16" className={size === "sm" ? "size-2.5" : "size-3"} aria-hidden="true">
        {type === "EPIC" ? <path d="M9.2 1.5 3.8 9h3.6l-.8 5.5L12.2 7H8.6z" fill="currentColor" /> : null}
        {type === "USER_STORY" ? <path d="M4.5 2.5h7v11L8 10.8l-3.5 2.7z" fill="currentColor" /> : null}
        {type === "TASK" ? (
          <path d="m3.5 8.4 3 3 6-6.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {type === "SUB_TASK" ? (
          <>
            <rect x="2.5" y="2.5" width="7" height="7" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <rect x="7" y="7" width="6.5" height="6.5" rx="1.2" fill="currentColor" />
          </>
        ) : null}
      </svg>
      {labelled ? <span className="sr-only">{ISSUE_TYPE_LABELS[type]}</span> : null}
    </span>
  );
}

export function IssueTypeBadge({ type, short = false }: { type: IssueType; short?: boolean }) {
  const style = ISSUE_TYPE_STYLES[type];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-md pl-1 pr-2 text-xs font-medium",
        style.soft,
        style.text,
      )}
    >
      <IssueTypeIcon type={type} size="sm" labelled={false} />
      {short ? ISSUE_TYPE_SHORT_LABELS[type] : ISSUE_TYPE_LABELS[type]}
    </span>
  );
}

/** A quiet key showing what each colour means. */
export function IssueTypeLegend({ className }: { className?: string }) {
  return (
    <ul aria-label="Issue type colours" className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted", className)}>
      {ISSUE_TYPE_ORDER.map((type) => (
        <li key={type} className="inline-flex items-center gap-1.5">
          <IssueTypeIcon type={type} size="sm" labelled={false} />
          {ISSUE_TYPE_SHORT_LABELS[type]}
        </li>
      ))}
    </ul>
  );
}

const statusTones: Record<IssueStatus, Tone> = {
  TO_DO: "gray",
  IN_PROGRESS: "blue",
  IN_REVIEW: "yellow",
  DONE: "green",
};

const statusDots: Record<IssueStatus, string> = {
  TO_DO: "bg-muted-2",
  IN_PROGRESS: "bg-info",
  IN_REVIEW: "bg-warning",
  DONE: "bg-success",
};

const priorityTones: Record<IssuePriority, Tone> = {
  LOWEST: "gray",
  LOW: "gray",
  MEDIUM: "yellow",
  HIGH: "red",
  HIGHEST: "dark-red",
};

/** Status is a round pill with a dot, so it never looks like a type chip. */
export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return (
    <Badge tone={statusTones[status]}>
      <span className={cn("size-1.5 rounded-full", statusDots[status])} aria-hidden="true" />
      {ISSUE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function IssueStatusDot({ status, className }: { status: IssueStatus; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", statusDots[status], className)} aria-hidden="true" />;
}

export function IssuePriorityBadge({ priority }: { priority: IssuePriority }) {
  return <Badge tone={priorityTones[priority]}>{ISSUE_PRIORITY_LABELS[priority]}</Badge>;
}
