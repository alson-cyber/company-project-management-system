import type { ProjectHealth, ProjectStatus } from "@/generated/prisma/enums";
import { addCalendarDays, calendarDayDiff } from "@/modules/projects/workspace.model";
import { PROJECT_HEALTH_LABELS } from "@/modules/projects/project.constants";

/** Open executable items at or above this count are "multiple overdue". */
export const MANAGEMENT_OVERDUE_CLUSTER = 3;
/** Executable items in review at or above this count are a review backlog. */
export const MANAGEMENT_REVIEW_BACKLOG = 3;
/** Target is approaching when it falls inside this many days, inclusive. */
export const MANAGEMENT_TARGET_DAYS = 14;
/** Open executable items required before an approaching target is called substantial. */
export const MANAGEMENT_SUBSTANTIAL_OPEN = 3;
/** An open executable item is stalled when it has not been updated for this many calendar days. */
export const MANAGEMENT_STALLED_DAYS = 14;

export const ATTENTION_KINDS = [
  "highest_overdue",
  "overdue_cluster",
  "target_approaching",
  "review_backlog",
  "target_passed",
  "at_risk",
  "blocked",
  "stalled",
] as const;

export type AttentionKind = (typeof ATTENTION_KINDS)[number];

export interface AttentionSignal {
  kind: AttentionKind;
  text: string;
}

export interface AttentionInput {
  health: ProjectHealth | null;
  status: ProjectStatus;
  targetDate: string | null;
  today: string;
  overdueExecutable: number;
  highestOverdue: number;
  openExecutable: number;
  inReviewExecutable: number;
  stalledExecutable: number;
}

function plural(count: number, singular: string, pluralWord = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralWord}`;
}

/**
 * Explainable management attention. Health labels are repeated, never computed.
 * Objective signals use the same overdue and executable definitions as the rest of the product.
 */
export function managementSignals(input: AttentionInput): AttentionSignal[] {
  const signals: AttentionSignal[] = [];
  if (input.highestOverdue > 0) {
    signals.push({
      kind: "highest_overdue",
      text: `${plural(input.highestOverdue, "overdue Highest-priority item")}`,
    });
  }
  if (input.overdueExecutable >= MANAGEMENT_OVERDUE_CLUSTER) {
    signals.push({
      kind: "overdue_cluster",
      text: `${plural(input.overdueExecutable, "overdue executable item")}`,
    });
  }
  const activeDelivery = input.status === "ACTIVE" || input.status === "ON_HOLD";
  if (
    input.targetDate &&
    activeDelivery &&
    input.targetDate >= input.today &&
    input.targetDate <= addCalendarDays(input.today, MANAGEMENT_TARGET_DAYS) &&
    input.openExecutable >= MANAGEMENT_SUBSTANTIAL_OPEN
  ) {
    const days = calendarDayDiff(input.targetDate, input.today);
    signals.push({
      kind: "target_approaching",
      text:
        days === 0
          ? `Target is today with ${plural(input.openExecutable, "open executable item")}`
          : `Target is in ${plural(days, "day")} with ${plural(input.openExecutable, "open executable item")}`,
    });
  }
  if (input.inReviewExecutable >= MANAGEMENT_REVIEW_BACKLOG) {
    signals.push({
      kind: "review_backlog",
      text: `${plural(input.inReviewExecutable, "executable item")} ${input.inReviewExecutable === 1 ? "is" : "are"} in review`,
    });
  }
  if (input.status === "ACTIVE" && input.targetDate && input.targetDate < input.today) {
    signals.push({
      kind: "target_passed",
      text: "Target date has passed and the project is still active",
    });
  }
  if (input.health === "AT_RISK") {
    signals.push({ kind: "at_risk", text: `Project lead marked this ${PROJECT_HEALTH_LABELS.AT_RISK}` });
  }
  if (input.health === "BLOCKED") {
    signals.push({ kind: "blocked", text: `Project lead marked this ${PROJECT_HEALTH_LABELS.BLOCKED}` });
  }
  if (input.stalledExecutable > 0) {
    signals.push({
      kind: "stalled",
      text: `${plural(input.stalledExecutable, "open executable item")} ${input.stalledExecutable === 1 ? "has" : "have"} had no update for ${MANAGEMENT_STALLED_DAYS} days`,
    });
  }
  return signals;
}

/** Updated on this day or earlier counts as stalled. */
export function stalledCutoff(today: string): string {
  return addCalendarDays(today, -MANAGEMENT_STALLED_DAYS);
}
