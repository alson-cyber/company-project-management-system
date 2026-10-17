import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { calendarDayUtc, todayInTimeZone } from "@/lib/calendar";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { timelineRows, timelineWindow } from "@/modules/projects/workspace.model";
import { listProjectWorkspaceIssues } from "@/modules/projects/workspace.queries";
import { requireAuthContext } from "@/server/access/session";
import { getEnv } from "@/server/env";
import { visibleProject } from "../guard";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string }> }): Promise<Metadata> {
  const { project } = await visibleProject((await params).projectKey);
  return { title: `${project.key} · Timeline` };
}

export default async function TimelinePage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();

  const issues = await listProjectWorkspaceIssues(ctx, project.id);
  const rows = timelineRows(issues);
  const today = todayInTimeZone(getEnv().COMPANY_TIMEZONE);
  const targetDate = project.targetDate ? calendarDayUtc(project.targetDate) : null;
  const dates = issues.flatMap((issue) => [issue.plannedStartDate, issue.dueDate].filter((date): date is string => Boolean(date)));
  const window = timelineWindow(dates, targetDate, today);
  const dated = issues.filter((issue) => issue.plannedStartDate || issue.dueDate).length;

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="timeline" />
      <p className="mb-3 text-xs text-muted">
        Month view. A bar needs a planned start and a due date. A single date is marked, and issues without either stay undated.
        {dated === 0 && issues.length > 0 ? " This project has no dated work yet." : ""}
      </p>
      <ProjectTimeline projectKey={project.key} rows={rows} window={window} today={today} targetDate={targetDate} />
    </>
  );
}
