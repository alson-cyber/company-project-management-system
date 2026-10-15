import type { Metadata } from "next";
import Link from "next/link";
import { ProjectTable } from "@/components/projects/project-table";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/components/ui/format";
import { PageHeader } from "@/components/ui/page-header";
import { describeActivity } from "@/modules/activity/activity.format";
import { listWorkspaceActivity } from "@/modules/activity/activity.queries";
import { listExecutivePortfolio } from "@/modules/projects/project.queries";
import { requireWorkspacePermission } from "@/server/access/session";

export const metadata: Metadata = { title: "Executive" };

export default async function ExecutivePage() {
  const ctx = await requireWorkspacePermission("executive.view");
  const [projects, activity] = await Promise.all([listExecutivePortfolio(ctx), listWorkspaceActivity(ctx, 20)]);
  const flagged = projects.filter((project) => project.health === "AT_RISK" || project.health === "BLOCKED").length;
  const unset = projects.filter((project) => project.health === null).length;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-2.5 text-xs font-semibold text-muted">
            Executive · company-wide visibility
          </span>
        }
        title="Company delivery overview"
        description="Portfolio health, membership and the master activity log. This view is read-only. Adding notes or comments later will require project membership."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4 shadow-card">
          <p className="text-[13px] text-muted">Active projects</p>
          <p className="mt-1.5 text-[28px] font-semibold tabular-nums tracking-[-0.03em]">{projects.length}</p>
          <p className="mt-0.5 text-xs text-muted">Company portfolio</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4 shadow-card">
          <p className="text-[13px] text-muted">Flagged by leads</p>
          <p className="mt-1.5 text-[28px] font-semibold tabular-nums tracking-[-0.03em]">{flagged}</p>
          <p className="mt-0.5 text-xs text-muted">At risk or blocked</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4 shadow-card">
          <p className="text-[13px] text-muted">Health not set</p>
          <p className="mt-1.5 text-[28px] font-semibold tabular-nums tracking-[-0.03em]">{unset}</p>
          <p className="mt-0.5 text-xs text-muted">Waiting on a project lead</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader
            title="Project health"
            description="Health is set by each project lead. It is not a calculated score."
          />
          {projects.length === 0 ? (
            <EmptyState title="No projects in this workspace" />
          ) : (
            <ProjectTable projects={projects} />
          )}
        </Card>

        <Card>
          <CardHeader title="Master activity log" description="Factual audit history across every project." />
          {activity.length === 0 ? (
            <EmptyState title="No recorded activity yet" />
          ) : (
            <ol className="divide-y divide-line/70">
              {activity.map((event) => (
                <li key={event.id} className="flex flex-col gap-1 px-5 py-3 text-[13px] sm:flex-row sm:items-baseline sm:gap-4">
                  <time className="shrink-0 text-xs tabular-nums text-muted" dateTime={event.occurredAt.toISOString()}>
                    {formatDateTime(event.occurredAt)}
                  </time>
                  <p className="min-w-0 flex-1">
                    <span className="font-semibold">{event.actorName ?? "System"}</span>{" "}
                    <span className="text-muted">{describeActivity(event)}</span>
                  </p>
                  {event.project ? (
                    <Link href={`/projects/${event.project.key}`} className="shrink-0 text-xs font-semibold text-accent-strong hover:underline">
                      {event.project.key}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
