import type { Metadata } from "next";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { calendarDayUtc, todayInTimeZone } from "@/lib/calendar";
import { listProjectActivity } from "@/modules/activity/activity.queries";
import { overviewSignals } from "@/modules/projects/workspace.model";
import { listProjectWorkspaceIssues } from "@/modules/projects/workspace.queries";
import { hasProjectPermission } from "@/server/access/policy";
import { getEnv } from "@/server/env";
import { visibleProject } from "./guard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}): Promise<Metadata> {
  const { projectKey } = await params;
  const { project } = await visibleProject(projectKey);
  return { title: `${project.key} · Overview` };
}

export default async function ProjectPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const { ctx, project } = await visibleProject(projectKey);

  const [issues, activity] = await Promise.all([
    listProjectWorkspaceIssues(ctx, project.id),
    listProjectActivity(ctx, project.id, 8),
  ]);
  const signals = overviewSignals(issues, {
    today: todayInTimeZone(getEnv().COMPANY_TIMEZONE),
    targetDate: project.targetDate ? calendarDayUtc(project.targetDate) : null,
    projectStatus: project.status,
  });

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="overview" />
      {issues.length === 0 ? <p className="mb-6 text-sm text-muted">This project has no issues yet.</p> : null}
      <ProjectOverview
        project={project}
        signals={signals}
        activity={activity}
        canManage={hasProjectPermission(ctx, "project.manage", project.id)}
        canSetHealth={hasProjectPermission(ctx, "project.health.set", project.id)}
      />
    </>
  );
}
