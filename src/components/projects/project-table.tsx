import Link from "next/link";
import { ProjectHealthBadge, ProjectRoleBadge, ProjectStatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/components/ui/format";
import type { ProjectSummary } from "@/modules/projects/project.queries";

export function ProjectIdentity({ project }: { project: Pick<ProjectSummary, "key" | "name" | "color" | "description"> }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold text-white"
        style={{ backgroundColor: project.color }}
        aria-hidden="true"
      >
        {project.key[0]}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {project.name} <span className="ml-1 text-xs font-medium text-muted">{project.key}</span>
        </p>
        {project.description ? <p className="truncate text-[13px] text-muted">{project.description}</p> : null}
      </div>
    </div>
  );
}

export function ProjectTable({ projects, showViewerRole = true }: { projects: ProjectSummary[]; showViewerRole?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-semibold text-muted">
            <th scope="col" className="px-5 py-2.5 font-semibold">Project</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Health</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Lead</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Members</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Target</th>
            {showViewerRole ? <th scope="col" className="px-5 py-2.5 font-semibold">Your role</th> : null}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className="border-b border-line/70 last:border-0 hover:bg-surface-2">
              <td className="max-w-[360px] px-5 py-3">
                <Link href={`/projects/${project.key}`} className="block rounded-md focus-visible:outline-offset-4">
                  <ProjectIdentity project={project} />
                </Link>
              </td>
              <td className="px-3 py-3">
                <ProjectStatusBadge status={project.status} />
              </td>
              <td className="px-3 py-3">
                <ProjectHealthBadge health={project.health} />
              </td>
              <td className="whitespace-nowrap px-3 py-3">{project.lead?.name ?? "—"}</td>
              <td className="px-3 py-3 tabular-nums">{project.memberCount}</td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatDate(project.targetDate)}</td>
              {showViewerRole ? (
                <td className="px-5 py-3">
                  <ProjectRoleBadge role={project.viewerRole} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
