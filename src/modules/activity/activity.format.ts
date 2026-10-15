import { PROJECT_HEALTH_LABELS, PROJECT_ROLE_LABELS } from "@/modules/projects/project.constants";

export interface ActivityEventView {
  id: string;
  occurredAt: Date;
  action: string;
  actorName: string | null;
  before: unknown;
  after: unknown;
}

function field(value: unknown, key: string): unknown {
  return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : undefined;
}

function healthLabel(value: unknown): string {
  return typeof value === "string" && value in PROJECT_HEALTH_LABELS
    ? PROJECT_HEALTH_LABELS[value as keyof typeof PROJECT_HEALTH_LABELS]
    : "Not set";
}

/** Human-readable sentence rendered from structured event data at read time. */
export function describeActivity(event: ActivityEventView): string {
  switch (event.action) {
    case "project.created":
      return `created the project`;
    case "project.health_changed":
      return `changed health from ${healthLabel(field(event.before, "health"))} to ${healthLabel(field(event.after, "health"))}`;
    case "project.member_added": {
      const role = field(event.after, "role");
      const label = typeof role === "string" && role in PROJECT_ROLE_LABELS ? PROJECT_ROLE_LABELS[role as keyof typeof PROJECT_ROLE_LABELS] : "member";
      return `added a ${label.toLowerCase()}`;
    }
    default:
      return event.action;
  }
}
