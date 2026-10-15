import Link from "next/link";
import { ProjectIdentity } from "@/components/projects/project-table";
import { Avatar } from "@/components/ui/avatar";
import { ProjectHealthBadge, ProjectRoleBadge, ProjectStatusBadge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/components/ui/format";
import type { ProjectDetail } from "@/modules/projects/project.queries";

const TABS = [
  { id: "overview", label: "Overview", href: (key: string) => `/projects/${key}` },
  { id: "issues", label: "Issues", href: (key: string) => `/projects/${key}/issues` },
  { id: "board", label: "Board", href: (key: string) => `/projects/${key}/board` },
  { id: "timeline", label: "Timeline", href: (key: string) => `/projects/${key}/timeline` },
  { id: "files", label: "Files", href: (key: string) => `/projects/${key}/files` },
  { id: "team", label: "Team", href: (key: string) => `/projects/${key}/team` },
  { id: "activity", label: "Activity", href: (key: string) => `/projects/${key}/activity` },
] as const;

export type ProjectSection = (typeof TABS)[number]["id"];

export function ProjectWorkspaceHeader({ project, current }: { project: ProjectDetail; current: ProjectSection }) {
  const shown = project.members.slice(0, 4);
  return (
    <div className="mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="sr-only">{project.name}</h1>
          <ProjectIdentity project={project} />
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <span>
              Lead <span className="font-medium text-ink">{project.lead?.name ?? "Unassigned"}</span>
            </span>
            <span>
              Target <time dateTime={project.targetDate?.toISOString()}>{formatDate(project.targetDate)}</time>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex -space-x-1.5" aria-hidden="true">
                {shown.map((member) => (
                  <Avatar key={member.userId} name={member.name} size="sm" className="ring-2 ring-surface" />
                ))}
              </span>
              <span>
                {project.memberCount} {project.memberCount === 1 ? "member" : "members"}
              </span>
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          <ProjectHealthBadge health={project.health} />
          <ProjectRoleBadge role={project.viewerRole} />
        </div>
      </div>
      <nav aria-label="Project sections" className="mt-3 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((tab) => (
          <Tab key={tab.id} href={tab.href(project.key)} current={current === tab.id}>
            {tab.label}
          </Tab>
        ))}
      </nav>
    </div>
  );
}

function Tab({ href, current, children }: { href: string; current: boolean; children: string }) {
  const className = cn(
    "border-b-2 px-3 py-2.5 text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    current ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
  );
  if (current) {
    return (
      <span aria-current="page" className={className}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
