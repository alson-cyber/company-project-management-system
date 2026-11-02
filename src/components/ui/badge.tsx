import type { ReactNode } from "react";
import type { ProjectHealth, ProjectRole, ProjectStatus } from "@/generated/prisma/enums";
import { cn } from "@/components/ui/cn";
import {
  PROJECT_HEALTH_LABELS,
  PROJECT_ROLE_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/modules/projects/project.constants";

export type Tone = "gray" | "blue" | "green" | "yellow" | "red" | "purple" | "teal" | "dark-red";

const tones: Record<Tone, string> = {
  gray: "bg-surface-3 text-muted",
  blue: "bg-info-soft text-info",
  green: "bg-success-soft text-success",
  yellow: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  "dark-red": "bg-danger text-surface",
  purple: "bg-purple-soft text-purple",
  teal: "bg-teal-soft text-teal",
};

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTones: Record<ProjectStatus, Tone> = {
  PLANNING: "purple",
  ACTIVE: "green",
  ON_HOLD: "yellow",
  COMPLETED: "teal",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={statusTones[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>;
}

const healthTones: Record<ProjectHealth, Tone> = {
  HEALTHY: "green",
  ATTENTION: "yellow",
  AT_RISK: "red",
  BLOCKED: "dark-red",
};

export function ProjectHealthBadge({ health }: { health: ProjectHealth | null }) {
  if (!health) return <Badge tone="gray">Not set</Badge>;
  return (
    <Badge tone={healthTones[health]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {PROJECT_HEALTH_LABELS[health]}
    </Badge>
  );
}

export function ProjectRoleBadge({ role }: { role: ProjectRole | null }) {
  if (!role) return <Badge tone="gray">Not a member</Badge>;
  return <Badge tone={role === "LEAD" ? "blue" : "gray"}>{PROJECT_ROLE_LABELS[role]}</Badge>;
}
