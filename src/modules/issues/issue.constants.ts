import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";

export const ISSUE_TYPES = ["EPIC", "USER_STORY", "TASK", "SUB_TASK"] as const satisfies readonly IssueType[];

export const ISSUE_STATUSES = ["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const satisfies readonly IssueStatus[];

export const ISSUE_PRIORITIES = [
  "LOWEST",
  "LOW",
  "MEDIUM",
  "HIGH",
  "HIGHEST",
] as const satisfies readonly IssuePriority[];

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  EPIC: "Epic",
  USER_STORY: "User Story",
  TASK: "Task",
  SUB_TASK: "Sub-task",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  TO_DO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  LOWEST: "Lowest",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  HIGHEST: "Highest",
};

/** Parent issue type required for each child type. Epics sit directly under the Project. */
export const REQUIRED_PARENT_TYPE: Record<IssueType, IssueType | null> = {
  EPIC: null,
  USER_STORY: "EPIC",
  TASK: "USER_STORY",
  SUB_TASK: "TASK",
};

/** The single legal child type for each issue type. Sub-tasks cannot have children. */
export const CHILD_TYPE_FOR: Record<IssueType, IssueType | null> = {
  EPIC: "USER_STORY",
  USER_STORY: "TASK",
  TASK: "SUB_TASK",
  SUB_TASK: null,
};

export const HIGH_PRIORITIES: ReadonlySet<IssuePriority> = new Set(["HIGH", "HIGHEST"]);

export const LABEL_COLORS = ["#4f6cf7", "#18b8a3", "#8b5cf6", "#e6a62b", "#dc4d5f", "#1f9d69", "#64748b"] as const;
