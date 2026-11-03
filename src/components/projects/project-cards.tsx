import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { ProjectHealthBadge, ProjectRoleBadge, ProjectStatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/components/ui/format";
import type { ProjectSummary } from "@/modules/projects/project.queries";

/** A soft wash of the project's own colour, used as a cover band. */
export function projectCover(color: string): string {
  return `linear-gradient(135deg, color-mix(in srgb, ${color} 38%, var(--color-surface)) 0%, color-mix(in srgb, ${color} 14%, var(--color-surface)) 100%)`;
}

/** Projects as cards with a colour cover, so each one is recognisable at a glance. */
export function ProjectCards({ projects }: { projects: ProjectSummary[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={`/projects/${project.key}`}
            className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-card transition-[box-shadow,transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
          >
            <div className="relative h-16" style={{ background: projectCover(project.color) }} aria-hidden="true">
              <span
                className="absolute -bottom-5 left-5 grid size-11 place-items-center rounded-xl text-base font-bold text-white shadow-card ring-4 ring-surface"
                style={{ backgroundColor: project.color }}
              >
                {project.key[0]}
              </span>
            </div>
            <div className="flex flex-1 flex-col px-5 pb-4 pt-7">
              <p className="flex items-baseline gap-2">
                <span className="text-[15px] font-semibold">{project.name}</span>
                <span className="text-xs font-medium text-muted">{project.key}</span>
              </p>
              {project.description ? (
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-muted">{project.description}</p>
              ) : null}
              <div className="mb-4 mt-3 flex flex-wrap items-center gap-1.5">
                <ProjectStatusBadge status={project.status} />
                <ProjectHealthBadge health={project.health} />
                {project.viewerRole ? <ProjectRoleBadge role={project.viewerRole} /> : null}
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-line/80 pt-3 text-xs text-muted">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  {project.lead ? <Avatar name={project.lead.name} size="sm" /> : null}
                  <span className="truncate">{project.lead ? project.lead.name : "No lead"}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {project.memberCount} {project.memberCount === 1 ? "member" : "members"}
                  {project.targetDate ? ` · ${formatDate(project.targetDate)}` : ""}
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
