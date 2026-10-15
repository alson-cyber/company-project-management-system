import Link from "next/link";
import { ProjectIssueLink } from "@/components/projects/project-issue-link";
import { ProjectSettingsForm } from "@/components/projects/project-settings-form";
import { HealthForm } from "@/app/(app)/projects/[projectKey]/health-form";
import { ProjectHealthBadge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/components/ui/format";
import { IssuePriorityBadge, IssueStatusBadge, IssueTypeBadge } from "@/components/ui/issue-badges";
import { activityDetail, describeActivity, type ActivityEventView } from "@/modules/activity/activity.format";
import { ISSUE_TYPE_LABELS } from "@/modules/issues/issue.constants";
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
    signals.targetOverdue ? "Target date passed" : signals.targetApproaching ? "Target date approaching" : null,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-8">
        <section aria-labelledby="progress-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="progress-heading" className="text-sm font-semibold">
              Progress
            </h2>
            <p className="text-[13px] text-muted">
              <span className="font-semibold tabular-nums text-ink">{progress.percent}%</span>
              {progress.total === 0
                ? " · no executable work yet"
                : ` · ${progress.done} of ${progress.total} executable items done`}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
            <div className="h-full bg-accent" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">Epics, stories, and tasks that contain sub-tasks are containers and are not counted twice.</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                <th scope="col" className="py-2 font-semibold">Type</th>
                <th scope="col" className="py-2 text-right font-semibold">Open</th>
                <th scope="col" className="py-2 text-right font-semibold">Done</th>
                <th scope="col" className="py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {signals.breakdown.map((row) => (
                <tr key={row.type} className="border-b border-line/70">
                  <th scope="row" className="py-2 text-left font-medium">{ISSUE_TYPE_LABELS[row.type]}</th>
                  <td className="py-2 text-right tabular-nums text-muted">{row.open}</td>
                  <td className="py-2 text-right tabular-nums">{row.done}</td>
                  <td className="py-2 text-right tabular-nums">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

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
        <section aria-labelledby="health-heading" className="border-t border-line pt-4">
          <h2 id="health-heading" className="text-sm font-semibold">Health</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Set by the project lead. The counts beside it are facts from the issue records.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ProjectHealthBadge health={project.health} />
            {project.healthUpdatedBy ? (
              <span className="text-xs text-muted">
                {project.healthUpdatedBy.name} · {formatDateTime(project.healthUpdatedAt)}
              </span>
            ) : null}
          </div>
          {facts.length > 0 ? <p className="mt-2 text-[13px]">{facts.join(" · ")}</p> : <p className="mt-2 text-[13px] text-muted">No overdue, highest-priority, or review signals right now.</p>}
          {project.healthNote ? <p className="mt-2 text-[13px] leading-relaxed text-muted">{project.healthNote}</p> : null}
          {canSetHealth ? (
            <div className="mt-4">
              <HealthForm projectId={project.id} projectKey={project.key} health={project.health} note={project.healthNote} />
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted">Only the project lead can change the health state.</p>
          )}
        </section>

        <section aria-labelledby="recent-activity-heading" className="border-t border-line pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent-activity-heading" className="text-sm font-semibold">Recent activity</h2>
            <Link href={`/projects/${project.key}/activity`} className="text-[13px] font-medium text-accent-strong hover:underline">
              View all
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No activity yet.</p>
          ) : (
            <ol className="mt-2 divide-y divide-line/70">
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
        </section>

        {canManage ? (
          <section aria-labelledby="settings-heading" className="border-t border-line pt-4">
            <h2 id="settings-heading" className="text-sm font-semibold">Project settings</h2>
            <div className="mt-3">
              <ProjectSettingsForm
                projectId={project.id}
                projectKey={project.key}
                name={project.name}
                description={project.description}
                status={project.status}
                targetDate={project.targetDate}
              />
            </div>
          </section>
        ) : null}
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
    { id: "priority", title: "High and highest priority, still open", items: highPriority, empty: "No high-priority work is open." },
    { id: "review", title: "In review", items: inReview, empty: "Nothing is in review." },
    { id: "done", title: "Recently completed", items: completed, empty: "Nothing has been completed." },
  ];
  return (
    <section aria-labelledby="attention-heading" className="grid gap-5">
      <h2 id="attention-heading" className="text-sm font-semibold">Needs attention</h2>
      {groups.map((group) => (
        <div key={group.id}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{group.title}</h3>
          {group.items.length === 0 ? (
            <p className="mt-1 text-sm text-muted">{group.empty}</p>
          ) : (
            <ul className="mt-1 divide-y divide-line/70">
              {group.items.map((item) => (
                <li key={`${group.id}-${item.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <ProjectIssueLink projectKey={projectKey} number={item.number} issueKey={item.key} title={item.title} />
                  <span className="ml-auto flex flex-wrap items-center gap-1.5">
                    <IssueTypeBadge type={item.type} />
                    <IssueStatusBadge status={item.status} />
                    <IssuePriorityBadge priority={item.priority} />
                    {item.dueDate ? (
                      <span className="text-xs text-muted">
                        {group.id === "overdue" ? `Overdue ${formatDate(item.dueDate)}` : formatDate(item.dueDate)}
                      </span>
                    ) : null}
                    {item.assigneeName ? <span className="text-xs text-muted">{item.assigneeName}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
