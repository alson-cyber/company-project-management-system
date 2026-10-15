import type { ProjectHealth, ProjectRole, ProjectStatus } from "@/generated/prisma/enums";

export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"] as const satisfies readonly ProjectStatus[];

export const PROJECT_HEALTH_STATES = ["HEALTHY", "ATTENTION", "AT_RISK", "BLOCKED"] as const satisfies readonly ProjectHealth[];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
};

export const PROJECT_HEALTH_LABELS: Record<ProjectHealth, string> = {
  HEALTHY: "Healthy",
  ATTENTION: "Attention",
  AT_RISK: "At risk",
  BLOCKED: "Blocked",
};

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  LEAD: "Project lead",
  MEMBER: "Member",
};

/** Project badge colours, taken from the prototype palette. */
export const PROJECT_COLORS = ["#18b8a3", "#8b5cf6", "#e6a62b", "#4f6cf7", "#dc4d5f", "#1f9d69", "#64748b"] as const;
