import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { Avatar } from "@/components/ui/avatar";
import { ProjectHealthBadge, ProjectRoleBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/components/ui/format";
import { describeActivity } from "@/modules/activity/activity.format";
import { listProjectActivity } from "@/modules/activity/activity.queries";
import { listProjectIssueTree } from "@/modules/issues/issue.queries";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { hasProjectPermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";
import { HealthForm } from "./health-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}): Promise<Metadata> {
  const { projectKey } = await params;
  return { title: projectKey.toUpperCase() };
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export default async function ProjectPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();

  const activity = await listProjectActivity(ctx, project.id, 15);
  const { progress } = await listProjectIssueTree(ctx, project.id);
  const canSetHealth = hasProjectPermission(ctx, "project.health.set", project.id);

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="overview" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="divide-y divide-line/70">
                <Detail label="Key">
                  <span className="font-mono text-[13px]">{project.key}</span>
                </Detail>
                <Detail label="Lead">{project.lead?.name ?? "—"}</Detail>
                <Detail label="Target date">{formatDate(project.targetDate)}</Detail>
                <Detail label="Created">{formatDate(project.createdAt)}</Detail>
                <Detail label="Description">
                  <span className="text-muted">{project.description ?? "No description."}</span>
                </Detail>
                <Detail label="Progress">
                  <span className="tabular-nums">
                    {progress.percent}%{" "}
                    <span className="text-muted">
                      ({progress.done}/{progress.total} executable items done)
                    </span>
                  </span>
                </Detail>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Members" description={`${project.members.length} people in this project.`} />
            <ul className="divide-y divide-line/70">
              {project.members.map((member) => (
                <li key={member.userId} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={member.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.name}</p>
                    <p className="truncate text-[13px] text-muted">{member.jobTitle ?? member.email}</p>
                  </div>
                  <ProjectRoleBadge role={member.role} />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader
              title="Health"
              description="Set by the project lead. Objective signals such as overdue work will appear alongside it."
            />
            <CardBody className="grid gap-4">
              <div className="flex items-center gap-2">
                <ProjectHealthBadge health={project.health} />
                {project.healthUpdatedBy ? (
                  <span className="text-xs text-muted">
                    {project.healthUpdatedBy.name} · {formatDateTime(project.healthUpdatedAt)}
                  </span>
                ) : null}
              </div>
              {project.healthNote ? <p className="text-[13px] leading-relaxed text-muted">{project.healthNote}</p> : null}
              {canSetHealth ? (
                <HealthForm
                  projectId={project.id}
                  projectKey={project.key}
                  health={project.health}
                  note={project.healthNote}
                />
              ) : (
                <p className="text-xs text-muted">Only the project lead can change the health state.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" description="Audited changes to this project." />
            {activity.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ol className="divide-y divide-line/70">
                {activity.map((event) => (
                  <li key={event.id} className="px-5 py-3 text-[13px]">
                    <p>
                      <span className="font-semibold">{event.actorName ?? "System"}</span>{" "}
                      <span className="text-muted">{describeActivity(event)}</span>
                    </p>
                    <time className="text-xs text-muted-2" dateTime={event.occurredAt.toISOString()}>
                      {formatDateTime(event.occurredAt)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
