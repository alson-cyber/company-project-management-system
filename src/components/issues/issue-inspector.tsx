import Link from "next/link";
import { CreateIssueForm } from "@/components/issues/create-issue-form";
import {
  ArchiveRestoreForm,
  CriteriaManager,
  IssuePropertiesForm,
  LabelsForm,
  StoryFieldsForm,
} from "@/components/issues/issue-forms";
import { IssuePriorityBadge, IssueStatusBadge, IssueTypeBadge } from "@/components/ui/issue-badges";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/components/ui/format";
import { describeActivity } from "@/modules/activity/activity.format";
import type { ActivityEventView } from "@/modules/activity/activity.format";
import type { IssueDetail } from "@/modules/issues/issue.queries";
import { ISSUE_TYPE_LABELS } from "@/modules/issues/issue.constants";

export function IssueInspector({
  issue,
  members,
  activity,
}: {
  issue: IssueDetail;
  members: Array<{ id: string; name: string }>;
  activity: ActivityEventView[];
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <IssueTypeBadge type={issue.type} />
        <span className="font-mono text-sm text-muted">{issue.key}</span>
        <IssueStatusBadge status={issue.status} />
        <IssuePriorityBadge priority={issue.priority} />
        {issue.overdue ? <span className="text-xs font-semibold text-danger">Overdue</span> : null}
        {issue.archivedAt ? <span className="text-xs font-semibold text-warning">Archived</span> : null}
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{issue.title}</h2>
      <p className="text-sm text-muted">
        {issue.parent ? (
          <>
            Parent{" "}
            <Link href={`/projects/${issue.project.key}/issues/${issue.parent.key.split("-").at(-1)}`} className="font-medium text-ink">
              {issue.parent.key} {issue.parent.title}
            </Link>
          </>
        ) : (
          "Epic under this project"
        )}
        {issue.type === "EPIC" || issue.type === "USER_STORY" ? (
          <>
            {" "}
            · Progress {issue.progress.percent}% ({issue.progress.done}/{issue.progress.total} executable)
          </>
        ) : null}
      </p>

      {issue.canMutate && issue.allowedChildType ? (
        <CreateIssueForm
          projectId={issue.project.id}
          type={issue.allowedChildType}
          parentId={issue.id}
          members={members}
        />
      ) : null}

      {issue.governingStory ? (
        <Card>
          <CardHeader
            title="Governing user story"
            description={`${issue.governingStory.key} · read-only context from the parent ${ISSUE_TYPE_LABELS.USER_STORY}.`}
          />
          <CardBody className="grid gap-1 text-sm">
            <p>
              <span className="text-muted">As a</span> {issue.governingStory.asA}
            </p>
            <p>
              <span className="text-muted">I want</span> {issue.governingStory.iWant}
            </p>
            <p>
              <span className="text-muted">So that</span> {issue.governingStory.soThat}
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Properties" />
        <CardBody>
          {issue.canMutate && !issue.archivedAt ? (
            <IssuePropertiesForm issue={issue} members={members} />
          ) : (
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted">Assignee</dt>
                <dd>{issue.assignee?.name ?? "Unassigned"}</dd>
              </div>
              <div>
                <dt className="text-muted">Due</dt>
                <dd>{formatDate(issue.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-muted">Description</dt>
                <dd className="whitespace-pre-wrap">{issue.description ?? "—"}</dd>
              </div>
            </dl>
          )}
        </CardBody>
      </Card>

      {issue.story ? (
        <Card>
          <CardHeader title="User Story" description="As a / I want / So that. Never auto-filled." />
          <CardBody>
            {issue.canMutate && !issue.archivedAt ? (
              <StoryFieldsForm issue={{ ...issue.story, id: issue.id, number: issue.number, project: issue.project }} />
            ) : (
              <div className="grid gap-1 text-sm">
                <p>
                  <span className="text-muted">As a</span> {issue.story.asA}
                </p>
                <p>
                  <span className="text-muted">I want</span> {issue.story.iWant}
                </p>
                <p>
                  <span className="text-muted">So that</span> {issue.story.soThat}
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}

      {issue.type === "USER_STORY" ? (
        <Card>
          <CardHeader title="Acceptance criteria" />
          <CardBody>
            {issue.canMutate && !issue.archivedAt ? (
              <CriteriaManager
                issueId={issue.id}
                projectKey={issue.project.key}
                issueNumber={issue.number}
                criteria={issue.acceptanceCriteria}
              />
            ) : (
              <ul className="grid gap-2 text-sm">
                {issue.acceptanceCriteria.map((criterion) => (
                  <li key={criterion.id}>
                    {criterion.isMet ? "☑" : "☐"} {criterion.text}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Labels" />
        <CardBody>
          {issue.canMutate && !issue.archivedAt ? (
            <LabelsForm issue={issue} />
          ) : (
            <p className="text-sm">{issue.labels.map((label) => label.name).join(", ") || "None"}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="People" />
        <CardBody className="grid gap-1 text-sm">
          <p>Assignee {issue.assignee?.name ?? "Unassigned"}</p>
          <p>Reporter {issue.reporter.name}</p>
          <p>Creator {issue.creator.name}</p>
          <p className="text-muted">
            Created {formatDateTime(issue.createdAt)} · Updated {formatDateTime(issue.updatedAt)}
          </p>
        </CardBody>
      </Card>

      {issue.canMutate ? (
        <Card>
          <CardHeader title="Archive" description="History is kept. Issue numbers are not reused." />
          <CardBody>
            <ArchiveRestoreForm issue={issue} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Activity" description="Append-only history. Completion stays with the actor who marked Done." />
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
      </Card>
    </div>
  );
}
