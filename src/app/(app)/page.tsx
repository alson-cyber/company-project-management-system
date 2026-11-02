import type { Metadata } from "next";
import Link from "next/link";
import { Greeting } from "@/components/dashboard/greeting";
import { ProjectTable } from "@/components/projects/project-table";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/components/ui/format";
import { AllClearIllustration } from "@/components/ui/illustrations";
import { ISSUE_TYPE_STYLES, IssuePriorityBadge, IssueTypeIcon } from "@/components/ui/issue-badges";
import { StatGrid, StatTile } from "@/components/ui/stat-tile";
import { countUnread } from "@/modules/attention/attention.queries";
import { filterMyWork } from "@/modules/attention/attention.rules";
import { loadMyWork } from "@/modules/attention/my-work.queries";
import {
  describeToday,
  todayFocus,
  todaySummary,
  type TodayItem,
  type TodayReason,
} from "@/modules/attention/today";
import { listMyProjects } from "@/modules/projects/project.queries";
import { describeAccess } from "@/server/access/describe";
import { hasWorkspacePermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireAuthContext();
  const timeZone = getEnv().COMPANY_TIMEZONE;
  const [projects, issues, unread] = await Promise.all([
    listMyProjects(ctx),
    loadMyWork(ctx),
    countUnread(ctx),
  ]);
  const summary = todaySummary(issues, ctx.userId, timeZone);
  const focus = todayFocus(issues, ctx.userId, timeZone, 5);
  const updated = filterMyWork(
    issues,
    ctx.userId,
    { projectId: "", status: "", type: "", priority: "", due: "", view: "updated", sort: "updated" },
    timeZone,
  ).slice(0, 6);
  const firstName = ctx.user.name.split(" ")[0] ?? ctx.user.name;

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Greeting firstName={firstName} />
          <p className="mt-1.5 text-[15px] text-muted">{describeToday(summary)}</p>
          <p className="mt-1 text-xs text-muted-2">{describeAccess(ctx).join(" · ")}</p>
        </div>
        {hasWorkspacePermission(ctx, "executive.view") ? (
          <Link href="/executive" className={buttonClasses({ variant: "secondary" })}>
            Executive overview
          </Link>
        ) : null}
      </div>

      <StatGrid className="mb-6">
        <StatTile
          icon="alert"
          tone="danger"
          emphasise={summary.overdue > 0}
          href="/my-work?view=overdue"
          label="Overdue"
          value={summary.overdue}
          hint="Assigned to you"
        />
        <StatTile
          icon="clock"
          tone="warning"
          href="/my-work?view=soon"
          label="Due soon"
          value={summary.dueSoon}
          hint="Next 14 days"
        />
        <StatTile
          icon="bell"
          tone="info"
          emphasise={unread > 0}
          href="/inbox"
          label="Inbox"
          value={unread}
          hint={unread === 1 ? "Unread notification" : "Unread notifications"}
        />
        <StatTile
          icon="check"
          tone="success"
          emphasise={summary.completedRecently > 0}
          href="/my-work?view=completed"
          label="Finished"
          value={summary.completedRecently}
          hint="By you, last 14 days"
        />
      </StatGrid>

      <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <section aria-labelledby="dash-today">
            <CardHeader
              id="dash-today"
              title="Today"
              description="The few things that matter most right now."
              action={
                <Link href="/my-work" className="text-[13px] font-medium text-accent-strong hover:underline">
                  All my work
                </Link>
              }
            />
            {focus.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-8 text-center">
                <AllClearIllustration className="h-24 w-auto" />
                <p className="mt-3 text-sm font-semibold">All caught up</p>
                <p className="mt-1 max-w-xs text-[13px] text-muted">
                  Nothing assigned to you is overdue, due soon, in progress or waiting in review.
                </p>
              </div>
            ) : (
              <ol className="grid gap-2 p-3">
                {focus.map((item) => (
                  <TodayRow key={item.issue.id} item={item} />
                ))}
              </ol>
            )}
          </section>
        </Card>

        <Card>
          <section aria-labelledby="dash-updated">
            <CardHeader
              id="dash-updated"
              title="Recently updated"
              action={
                <Link
                  href="/my-work?view=updated&sort=updated"
                  className="text-[13px] font-medium text-accent-strong hover:underline"
                >
                  View all
                </Link>
              }
            />
            <CardBody>
              <UpdatedList issues={updated} />
            </CardBody>
          </section>
        </Card>
      </div>

      <Card>
        <section aria-labelledby="dash-projects">
          <CardHeader id="dash-projects" title="Your projects" />
          {projects.length === 0 ? (
            <CardBody>
              <p className="text-sm text-muted">You are not a member of any project yet.</p>
            </CardBody>
          ) : (
            <ProjectTable projects={projects} />
          )}
        </section>
      </Card>
    </>
  );
}

const REASONS: Record<TodayReason, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-danger-soft text-danger" },
  soon: { label: "Due soon", className: "bg-warning-soft text-warning" },
  progress: { label: "In progress", className: "bg-info-soft text-info" },
  review: { label: "In review", className: "bg-purple-soft text-purple" },
};

function TodayRow({ item }: { item: TodayItem }) {
  const { issue, reason } = item;
  const tag = REASONS[reason];
  return (
    <li>
      <Link
        href={`/issues/${issue.key}`}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-l-[3px] border-line bg-surface px-3.5 py-3",
          "transition-[box-shadow,transform] duration-150 hover:-translate-y-px hover:shadow-lift",
          ISSUE_TYPE_STYLES[issue.type].stripe,
        )}
      >
        <IssueTypeIcon type={issue.type} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{issue.title}</span>
          <span className="block truncate text-xs text-muted">
            <span className="font-mono">{issue.key}</span> · {issue.projectName}
            {issue.dueDate ? ` · Due ${formatDate(issue.dueDate)}` : ""}
          </span>
        </span>
        <span className="hidden sm:inline-flex">
          <IssuePriorityBadge priority={issue.priority} />
        </span>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", tag.className)}>
          {tag.label}
        </span>
      </Link>
    </li>
  );
}

function UpdatedList({
  issues,
}: {
  issues: { id: string; key: string; title: string; projectName: string; updatedAt: string }[];
}) {
  if (issues.length === 0)
    return (
      <p className="text-sm text-muted">No open work assigned to you was updated in the last 14 days.</p>
    );
  return (
    <ul className="divide-y divide-line/70">
      {issues.map((issue) => (
        <li key={issue.id} className="py-2.5 text-sm">
          <Link href={`/issues/${issue.key}`} className="font-medium hover:underline">
            <span className="mr-2 font-mono text-xs text-muted">{issue.key}</span>
            {issue.title}
          </Link>
          <p className="text-xs text-muted">
            {issue.projectName} · {formatDate(issue.updatedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
