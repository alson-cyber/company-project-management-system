import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectOverview } from "@/components/projects/project-overview";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { calendarDayUtc, todayInTimeZone } from "@/lib/calendar";
import { listProjectActivity } from "@/modules/activity/activity.queries";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { overviewSignals } from "@/modules/projects/workspace.model";
import { listProjectWorkspaceIssues } from "@/modules/projects/workspace.queries";
import { hasProjectPermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";
import { getEnv } from "@/server/env";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}): Promise<Metadata> {
  const { projectKey } = await params;
  return { title: `${projectKey.toUpperCase()} · Overview` };
}

export default async function ProjectPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();

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
