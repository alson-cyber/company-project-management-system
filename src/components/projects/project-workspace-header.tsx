import Link from "next/link";
import { ProjectIdentity } from "@/components/projects/project-table";
import { ProjectHealthBadge, ProjectRoleBadge, ProjectStatusBadge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import type { ProjectDetail } from "@/modules/projects/project.queries";

const LATER_TABS = ["Board", "Timeline", "Files", "Team", "Activity"] as const;

export function ProjectWorkspaceHeader({
  project,
  current,
}: {
  project: ProjectDetail;
  current: "overview" | "issues";
}) {
  return (
    <div className="mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="sr-only">{project.name}</h1>
          <ProjectIdentity project={project} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectStatusBadge status={project.status} />
          <ProjectHealthBadge health={project.health} />
          <ProjectRoleBadge role={project.viewerRole} />
        </div>
      </div>
      <nav aria-label="Project sections" className="mt-3 flex gap-1 overflow-x-auto border-b border-line">
        <Tab href={`/projects/${project.key}`} current={current === "overview"}>
          Overview
        </Tab>
        <Tab href={`/projects/${project.key}/issues`} current={current === "issues"}>
          Issues
        </Tab>
        {LATER_TABS.map((tab) => (
          <span
            key={tab}
            aria-disabled="true"
            title="Not available yet"
            className="cursor-default border-b-2 border-transparent px-3 py-2.5 text-[13px] text-muted-2"
          >
            {tab}
            <span className="sr-only">, not available yet</span>
          </span>
        ))}
      </nav>
    </div>
  );
}

function Tab({ href, current, children }: { href: string; current: boolean; children: string }) {
  const className = cn(
    "border-b-2 px-3 py-2.5 text-[13px]",
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
