import Link from "next/link";
import { ProjectIssueLink } from "@/components/projects/project-issue-link";
import { ProjectSettingsForm } from "@/components/projects/project-settings-form";
import { HealthForm } from "@/app/(app)/projects/[projectKey]/health-form";
import { ProjectHealthBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AllClearIllustration } from "@/components/ui/illustrations";
import { StatGrid, StatTile } from "@/components/ui/stat-tile";
import { formatDate, formatDateTime } from "@/components/ui/format";
import {
  ISSUE_TYPE_STYLES,
  IssuePriorityBadge,
  IssueStatusDot,
  IssueTypeIcon,
} from "@/components/ui/issue-badges";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { activityDetail, describeActivity, type ActivityEventView } from "@/modules/activity/activity.format";
import { HIGH_PRIORITIES, ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS } from "@/modules/issues/issue.constants";
import type { ProjectDetail } from "@/modules/projects/project.queries";
import type { AttentionItem, OverviewSignals } from "@/modules/projects/workspace.model";

export function ProjectOverview({
  project,
  signals,
  activity,
  canManage,
  canSetHealth,
}: {
  project: ProjectDetail;
  signals: OverviewSignals;
  activity: ActivityEventView[];
  canManage: boolean;
  canSetHealth: boolean;
}) {
  const { progress } = signals;
  const facts = [
    signals.overdue.length ? `${signals.overdue.length} overdue` : null,
    signals.highestOpenCount ? `${signals.highestOpenCount} highest priority open` : null,
    signals.inReview.length ? `${signals.inReview.length} in review` : null,
    signals.targetOverdue
      ? "Target date passed"
      : signals.targetApproaching
        ? "Target date approaching"
        : null,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <div className="grid gap-6">
      <StatGrid className="xl:grid-cols-5">
        <StatTile
          icon="chart"
          tone="success"
          label="Progress"
          value={`${progress.percent}%`}
          hint={
            progress.total === 0 ? "No executable work yet" : `${progress.done} of ${progress.total} done`
          }
        />
        <StatTile
          icon="alert"
          tone="danger"
          emphasise={signals.overdue.length > 0}
          href="#attention-heading"
          label="Overdue"
          value={signals.overdue.length}
          hint="Due before today"
        />
        <StatTile
          icon="clock"
          tone="warning"
          href="#attention-heading"
          label="Due soon"
          value={signals.dueSoon.length}
          hint="Next 14 days"
        />
        <StatTile
          icon="flag"
          tone="warning"
          emphasise={signals.highestOpenCount > 0}
          href="#attention-heading"
          label="Highest open"
          value={signals.highestOpenCount}
          hint="Priority is Highest"
        />
        <StatTile
          icon="eye"
          tone="purple"
          href="#attention-heading"
          label="In review"
          value={signals.inReview.length}
          hint="Waiting on review"
        />
      </StatGrid>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          <Card>
            <section aria-labelledby="progress-heading">
              <CardHeader
                id="progress-heading"
                title="Progress by type"
                description="Epics, stories, and tasks that contain sub-tasks are containers and are not counted twice."
              />
              <CardBody>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-success"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <span className="text-[13px] font-semibold tabular-nums">{progress.percent}%</span>
                </div>
                <p className="-mt-2 mb-4 text-xs text-muted">
                  {progress.total === 0
                    ? "There is no executable work yet."
                    : `${progress.done} of ${progress.total} executable items done`}
                </p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {signals.breakdown.map((row) => (
                    <li key={row.type} className={`rounded-xl p-3 ${ISSUE_TYPE_STYLES[row.type].soft}`}>
                      <p
                        className={`flex items-center gap-1.5 text-xs font-semibold ${ISSUE_TYPE_STYLES[row.type].text}`}
                      >
                        <IssueTypeIcon type={row.type} size="sm" labelled={false} />
                        {ISSUE_TYPE_LABELS[row.type]}
                      </p>
                      <p className="mt-2 text-xl font-semibold tabular-nums text-ink">
                        {row.done}
                        <span className="text-sm font-medium text-muted"> / {row.total}</span>
                      </p>
                      <p className="text-xs text-muted">{row.open} open</p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </section>
          </Card>

          <Attention
            projectKey={project.key}
            overdue={signals.overdue}
            dueSoon={signals.dueSoon}
            highPriority={signals.highPriorityOpen}
            inReview={signals.inReview}
            completed={signals.recentlyCompleted}
          />
        </div>

        <div className="grid gap-6">
          <Card>
            <section aria-labelledby="health-heading">
              <CardHeader
                id="health-heading"
                title="Health"
                description="Set by the project lead. The counts beside it are facts from the issue records."
              />
              <CardBody>
                <div className="flex flex-wrap items-center gap-2">
                  <ProjectHealthBadge health={project.health} />
                  {project.healthUpdatedBy ? (
                    <span className="text-xs text-muted">
                      {project.healthUpdatedBy.name} · {formatDateTime(project.healthUpdatedAt)}
                    </span>
                  ) : null}
                </div>
                {facts.length > 0 ? (
                  <p className="mt-2 text-[13px]">{facts.join(" · ")}</p>
                ) : (
                  <p className="mt-2 text-[13px] text-muted">
                    No overdue, highest-priority, or review signals right now.
                  </p>
                )}
                {project.healthNote ? (
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{project.healthNote}</p>
                ) : null}
                {canSetHealth ? (
                  <div className="mt-4">
                    <HealthForm
                      projectId={project.id}
                      projectKey={project.key}
                      health={project.health}
                      note={project.healthNote}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted">
                    Only the project lead can change the health state.
                  </p>
                )}
              </CardBody>
            </section>
          </Card>

          <Card>
            <section aria-labelledby="recent-activity-heading">
              <CardHeader
                id="recent-activity-heading"
                title="Recent activity"
                action={
                  <Link
                    href={`/projects/${project.key}/activity`}
                    className="text-[13px] font-medium text-accent-strong hover:underline"
                  >
                    View all
                  </Link>
                }
              />
              <CardBody className="py-2">
                {activity.length === 0 ? (
                  <p className="py-2 text-sm text-muted">No activity yet.</p>
                ) : (
                  <ol className="divide-y divide-line/70">
                    {activity.map((event) => (
                      <li key={event.id} className="py-2.5 text-[13px]">
                        <p>
                          <span className="font-semibold">{event.actorName ?? "System"}</span>{" "}
                          <span className="text-muted">{describeActivity(event)}</span>
                        </p>
                        {activityDetail(event) ? <p className="text-muted">{activityDetail(event)}</p> : null}
                        <time className="text-xs text-muted-2" dateTime={event.occurredAt.toISOString()}>
                          {formatDateTime(event.occurredAt)}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </section>
          </Card>

          {canManage ? (
            <Card>
              <section aria-labelledby="settings-heading">
                <CardHeader id="settings-heading" title="Project settings" />
                <CardBody>
                  <ProjectSettingsForm
                    projectId={project.id}
                    projectKey={project.key}
                    name={project.name}
                    description={project.description}
                    status={project.status}
                    targetDate={project.targetDate}
                  />
                </CardBody>
              </section>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Attention({
  projectKey,
  overdue,
  dueSoon,
  highPriority,
  inReview,
  completed,
}: {
  projectKey: string;
  overdue: AttentionItem[];
  dueSoon: AttentionItem[];
  highPriority: AttentionItem[];
  inReview: AttentionItem[];
  completed: AttentionItem[];
}) {
  const groups = [
    { id: "overdue", title: "Overdue", items: overdue, empty: "Nothing is overdue." },
    { id: "soon", title: "Due in the next 14 days", items: dueSoon, empty: "Nothing is due soon." },
    {
      id: "priority",
      title: "High and highest priority, still open",
      items: highPriority,
      empty: "No high-priority work is open.",
    },
    { id: "review", title: "In review", items: inReview, empty: "Nothing is in review." },
    { id: "done", title: "Recently completed", items: completed, empty: "Nothing has been completed." },
  ];
  return (
    <Card>
      <section aria-labelledby="attention-heading" className="scroll-mt-20">
        <CardHeader id="attention-heading" title="Needs attention" />
        <CardBody className="grid gap-3">
          {groups.every((group) => group.items.length === 0) ? (
            <div className="flex flex-col items-center py-4 text-center">
              <AllClearIllustration className="h-20 w-auto" />
              <p className="mt-2 text-sm font-semibold">All clear</p>
              <p className="mt-0.5 text-[13px] text-muted">
                Nothing is overdue, due soon, high priority or waiting in review.
              </p>
            </div>
          ) : null}
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <div key={group.id} className="rounded-xl border border-line bg-surface-2 px-4 py-3">
                <h3 className="flex items-center justify-between text-xs font-semibold text-muted">
                  {group.title}
                  <span className="rounded-full bg-surface px-2 py-0.5 tabular-nums ring-1 ring-line">
                    {group.items.length}
                  </span>
                </h3>
                {
                  <ul className="mt-1 divide-y divide-line/70">
                    {group.items.map((item) => (
                      <li key={`${group.id}-${item.id}`} className="flex items-center gap-2.5 py-2">
                        <IssueTypeIcon type={item.type} size="sm" />
                        <span className="min-w-0 flex-1 truncate">
                          <ProjectIssueLink
                            projectKey={projectKey}
                            number={item.number}
                            issueKey={item.key}
                            title={item.title}
                          />
                        </span>
                        <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted sm:inline-flex">
                          <IssueStatusDot status={item.status} className="size-1.5" />
                          {ISSUE_STATUS_LABELS[item.status]}
                        </span>
                        {HIGH_PRIORITIES.has(item.priority) ? (
                          <IssuePriorityBadge priority={item.priority} />
                        ) : null}
                        {item.dueDate ? (
                          <span
                            className={cn(
                              "hidden shrink-0 text-xs md:inline",
                              group.id === "overdue" ? "font-medium text-danger" : "text-muted",
                            )}
                          >
                            {formatDate(item.dueDate)}
                          </span>
                        ) : null}
                        {item.assigneeName ? (
                          <span title={item.assigneeName} className="shrink-0">
                            <Avatar name={item.assigneeName} size="sm" />
                            <span className="sr-only">Assigned to {item.assigneeName}</span>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                }
              </div>
            ))}
        </CardBody>
      </section>
    </Card>
  );
}
