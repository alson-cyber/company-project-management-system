import Link from "next/link";
import { projectCover } from "@/components/projects/project-cards";
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

export function ProjectWorkspaceHeader({
  project,
  current,
}: {
  project: ProjectDetail;
  current: ProjectSection;
}) {
  if (current !== "overview") return <CompactHeader project={project} current={current} />;
  const shown = project.members.slice(0, 4);
  return (
    <div className="mb-4 min-w-0">
      <div
        className="h-20 rounded-[var(--radius-card)] sm:h-24"
        style={{ background: projectCover(project.color) }}
        aria-hidden="true"
      />
      <div className="-mt-7 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div className="min-w-0">
          <span
            className="grid size-14 place-items-center rounded-2xl text-xl font-bold text-white shadow-card ring-4 ring-canvas"
            style={{ backgroundColor: project.color }}
            aria-hidden="true"
          >
            {project.key[0]}
          </span>
          <h1 className="mt-3 flex flex-wrap items-baseline gap-x-2 text-[24px] font-semibold leading-tight tracking-[-0.03em]">
            {project.name}
            <span className="text-sm font-medium tracking-normal text-muted">{project.key}</span>
          </h1>
          {project.description ? <p className="mt-1 text-sm text-muted">{project.description}</p> : null}
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <span>
              Lead <span className="font-medium text-ink">{project.lead?.name ?? "Unassigned"}</span>
            </span>
            <span>
              Target{" "}
              <time dateTime={project.targetDate?.toISOString()}>{formatDate(project.targetDate)}</time>
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
      <nav
        aria-label="Project sections"
        className="mt-3 flex min-w-0 gap-1 overflow-x-auto border-b border-line"
      >
        {TABS.map((tab) => (
          <Tab key={tab.id} href={tab.href(project.key)} current={current === tab.id}>
            {tab.label}
          </Tab>
        ))}
      </nav>
    </div>
  );
}

/**
 * On work tabs (Issues, Board, Timeline…) the header shrinks to one line so the work itself
 * starts near the top of the screen. The full cover and details live on Overview.
 */
function CompactHeader({ project, current }: { project: ProjectDetail; current: ProjectSection }) {
  return (
    <div className="mb-4 min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold text-white shadow-card"
          style={{ backgroundColor: project.color }}
          aria-hidden="true"
        >
          {project.key[0]}
        </span>
        <h1 className="flex min-w-0 items-baseline gap-2 text-lg font-semibold tracking-[-0.02em]">
          <Link href={`/projects/${project.key}`} className="truncate hover:underline">
            {project.name}
          </Link>
          <span className="text-xs font-medium tracking-normal text-muted">{project.key}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <ProjectStatusBadge status={project.status} />
          <ProjectHealthBadge health={project.health} />
        </div>
        <span className="ml-auto hidden text-xs text-muted md:inline">
          Lead <span className="font-medium text-ink">{project.lead?.name ?? "Unassigned"}</span>
          {project.targetDate ? (
            <>
              {" · Target "}
              <time dateTime={project.targetDate.toISOString()}>{formatDate(project.targetDate)}</time>
            </>
          ) : null}
        </span>
      </div>
      <nav
        aria-label="Project sections"
        className="mt-2 flex min-w-0 gap-1 overflow-x-auto border-b border-line"
      >
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
    "shrink-0 border-b-2 px-3 py-2.5 text-[13px] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
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
