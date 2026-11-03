import Link from "next/link";
import { activityActionLabel, activityChangeDetail, describeActivity } from "@/modules/activity/activity.format";
import type { WorkspaceActivityEvent } from "@/modules/activity/activity.queries";
import { formatDateTime } from "@/components/ui/format";
import { ProjectName } from "@/components/projects/project-name";

export function ActivityLog({
  rows,
  empty,
}: {
  rows: (WorkspaceActivityEvent & { actorId?: string | null })[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line/70">
      {rows.map((event) => {
        const detail = activityChangeDetail(event);
        return (
          <li key={event.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-baseline">
            <div className="min-w-0">
              <p>
                <span className="font-medium">{event.actorName ?? "Someone"}</span>{" "}
                <span className="text-muted">{describeActivity(event)}</span>
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                <span>{activityActionLabel(event.action)}</span>
                {event.project ? (
                  <Link href={`/projects/${event.project.key}`} className="hover:underline">
                    <ProjectName name={event.project.name} color={event.project.color} />
                  </Link>
                ) : null}
                {event.issue && event.project ? (
                  <Link href={`/issues/${event.issue.key}`} className="hover:underline">
                    {event.issue.key}
                  </Link>
                ) : null}
                {detail ? <span>{detail}</span> : null}
              </p>
            </div>
            <time className="text-xs text-muted sm:text-right" dateTime={event.occurredAt.toISOString()}>
              {formatDateTime(event.occurredAt)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
