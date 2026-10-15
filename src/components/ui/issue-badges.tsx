import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";
import { Badge, type Tone } from "@/components/ui/badge";
import {
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_TYPE_LABELS,
} from "@/modules/issues/issue.constants";

const typeTones: Record<IssueType, Tone> = {
  EPIC: "purple",
  USER_STORY: "blue",
  TASK: "gray",
  SUB_TASK: "teal",
};

const statusTones: Record<IssueStatus, Tone> = {
  TO_DO: "gray",
  IN_PROGRESS: "blue",
  IN_REVIEW: "yellow",
  DONE: "green",
};

const priorityTones: Record<IssuePriority, Tone> = {
  LOWEST: "gray",
  LOW: "gray",
  MEDIUM: "yellow",
  HIGH: "red",
  HIGHEST: "dark-red",
};

export function IssueTypeBadge({ type }: { type: IssueType }) {
  return <Badge tone={typeTones[type]}>{ISSUE_TYPE_LABELS[type]}</Badge>;
}

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <Badge tone={statusTones[status]}>{ISSUE_STATUS_LABELS[status]}</Badge>;
}

export function IssuePriorityBadge({ priority }: { priority: IssuePriority }) {
  return <Badge tone={priorityTones[priority]}>{ISSUE_PRIORITY_LABELS[priority]}</Badge>;
}
