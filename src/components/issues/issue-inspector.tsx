"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArchiveRestoreForm,
  CriteriaManager,
  IssuePropertiesForm,
  LabelsForm,
  StoryFieldsForm,
} from "@/components/issues/issue-forms";
import { Avatar } from "@/components/ui/avatar";
import { IssuePriorityBadge, IssueStatusBadge, IssueTypeBadge } from "@/components/ui/issue-badges";
import { cn } from "@/components/ui/cn";
import { formatDate, formatDateTime } from "@/components/ui/format";
import { describeActivity, type ActivityEventView } from "@/modules/activity/activity.format";
import { ISSUE_TYPE_LABELS } from "@/modules/issues/issue.constants";
import type { IssueDetail, IssueListItem } from "@/modules/issues/issue.queries";

const TABS = ["Details", "Notes", "Attachments", "Comments", "Activity", "Sub-tasks"] as const;
type InspectorTab = (typeof TABS)[number];

export function IssueInspector({
  issue,
  members,
  activity,
  childIssues,
}: {
  issue: IssueDetail;
  members: Array<{ id: string; name: string }>;
  activity: ActivityEventView[];
  childIssues: IssueListItem[];
}) {
  const [tab, setTab] = useState<InspectorTab>("Details");

  return (
    <div className="flex min-h-0 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            href={`/projects/${issue.project.key}/issues`}
            scroll={false}
            className="text-sm font-medium text-accent-strong"
          >
            <span className="lg:hidden">Back to hierarchy</span>
            <span className="hidden lg:inline">Close</span>
          </Link>
          {issue.canMutate ? (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded px-2 py-1 text-[13px] font-medium text-muted marker:content-none hover:bg-surface-2 hover:text-ink [&::-webkit-details-marker]:hidden">
                More actions
              </summary>
              <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-line bg-surface p-3">
                <h3 className="text-sm font-semibold">{issue.archivedAt ? "Restore" : "Archive"}</h3>
                <p className="mb-2 mt-1 text-[13px] leading-relaxed text-muted">
                  History is kept. The issue key is not reused.
                </p>
                <ArchiveRestoreForm issue={issue} />
              </div>
            </details>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IssueTypeBadge type={issue.type} />
          <span className="font-mono text-[13px] text-muted">{issue.key}</span>
          <IssueStatusBadge status={issue.status} />
          <IssuePriorityBadge priority={issue.priority} />
          {issue.overdue ? <span className="text-xs font-semibold text-danger">Overdue</span> : null}
          {issue.archivedAt ? <span className="text-xs font-semibold text-warning">Archived</span> : null}
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em]">{issue.title}</h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          {issue.assignee ? <Avatar name={issue.assignee.name} size="sm" className="size-6 text-xs" /> : null}
          <span>{issue.assignee?.name ?? "Unassigned"}</span>
          {issue.dueDate ? <span>Due {formatDate(issue.dueDate)}</span> : null}
          {issue.parent ? (
            <span>
              Parent{" "}
              <Link
                href={`/projects/${issue.project.key}/issues/${issue.parent.key.split("-").at(-1)}`}
                scroll={false}
                className="font-medium text-ink"
              >
                {issue.parent.key}
              </Link>
            </span>
          ) : null}
        </p>
      </header>

      {issue.type === "USER_STORY" && issue.story ? (
        <div className="border-b border-line bg-surface-2 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">User story</p>
          <p className="mt-2 text-[15px] leading-relaxed">
            <span className="text-muted">As a </span>
            {issue.story.asA}
          </p>
          <p className="mt-1 text-[15px] leading-relaxed">
            <span className="text-muted">I want </span>
            {issue.story.iWant}
          </p>
          <p className="mt-1 text-[15px] leading-relaxed">
            <span className="text-muted">So that </span>
            {issue.story.soThat}
          </p>
          {issue.acceptanceCriteria.length === 0 ? (
            <p className="mt-3 text-[13px] text-warning">No acceptance criteria yet.</p>
          ) : null}
        </div>
      ) : null}

      {issue.governingStory ? (
        <div className="border-b border-line px-5 py-3 text-[13px] leading-relaxed">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Governing story</p>
          <p className="mt-1">
            <Link
              href={`/projects/${issue.project.key}/issues/${issue.governingStory.key.split("-").at(-1)}`}
              scroll={false}
              className="font-mono font-medium"
            >
              {issue.governingStory.key}
            </Link>{" "}
            {issue.governingStory.title}
          </p>
          <p className="mt-1 text-muted">
            As a {issue.governingStory.asA}, I want {issue.governingStory.iWant}, so that {issue.governingStory.soThat}
          </p>
        </div>
      ) : null}

      <div role="tablist" aria-label="Issue sections" className="flex gap-1 overflow-x-auto border-b border-line px-3">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`issue-tab-${name}`}
            aria-selected={tab === name}
            aria-controls={`issue-panel-${name}`}
            className={cn(
              "shrink-0 border-b-2 px-2.5 py-2.5 text-[13px]",
              tab === name ? "border-accent font-semibold text-ink" : "border-transparent text-muted hover:text-ink",
            )}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`issue-panel-${tab}`}
        aria-labelledby={`issue-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
      >
        {tab === "Details" ? (
          <Details issue={issue} members={members} />
        ) : null}
        {tab === "Notes" ? (
          <Deferred
            title="Notes are not in this stage"
            body="Notes will be a separate, durable record. They are not comments and they are not activity."
          />
        ) : null}
        {tab === "Attachments" ? (
          <Deferred
            title="Attachments are not in this stage"
            body="Files will be stored through the storage interface. There is nothing to upload yet."
          />
        ) : null}
        {tab === "Comments" ? (
          <Deferred
            title="Comments are not in this stage"
            body="Discussion will live in its own thread. This panel will not invent messages."
          />
        ) : null}
        {tab === "Activity" ? <ActivityList activity={activity} /> : null}
        {tab === "Sub-tasks" ? (
          <ChildList projectKey={issue.project.key} type={issue.type} childIssues={childIssues} />
        ) : null}
      </div>
    </div>
  );
}

function Details({ issue, members }: { issue: IssueDetail; members: Array<{ id: string; name: string }> }) {
  return (
    <div className="grid gap-6">
      {(issue.type === "EPIC" || issue.type === "USER_STORY") && issue.progress.total > 0 ? (
        <p className="text-[13px] text-muted">
          Progress {issue.progress.percent}% ({issue.progress.done}/{issue.progress.total} executable items done)
        </p>
      ) : null}
      {issue.canMutate && !issue.archivedAt ? (
        <IssuePropertiesForm issue={issue} members={members} />
      ) : (
        <p className="whitespace-pre-wrap text-sm">{issue.description ?? "No description."}</p>
      )}
      {issue.story && issue.canMutate && !issue.archivedAt ? (
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold">Edit story</h3>
          <StoryFieldsForm issue={{ ...issue.story, id: issue.id, number: issue.number, project: issue.project }} />
        </section>
      ) : null}
      {issue.type === "USER_STORY" ? (
        <section className="grid gap-2">
          <h3 className="text-sm font-semibold">Acceptance criteria</h3>
          {issue.canMutate && !issue.archivedAt ? (
            <CriteriaManager
              issueId={issue.id}
              projectKey={issue.project.key}
              issueNumber={issue.number}
              criteria={issue.acceptanceCriteria}
            />
          ) : (
            <ul className="grid gap-1 text-sm">
              {issue.acceptanceCriteria.map((criterion) => (
                <li key={criterion.id}>
                  {criterion.isMet ? "Met" : "Open"} — {criterion.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      <section>
        <h3 className="mb-2 text-sm font-semibold">Labels</h3>
        {issue.canMutate && !issue.archivedAt ? (
          <LabelsForm issue={issue} />
        ) : (
          <p className="text-sm">{issue.labels.map((label) => label.name).join(", ") || "None"}</p>
        )}
      </section>
      <section className="grid gap-1 text-[13px] text-muted">
        <p>Reporter {issue.reporter.name}</p>
        <p>Creator {issue.creator.name}</p>
        <p>
          Created {formatDateTime(issue.createdAt)} · Updated {formatDateTime(issue.updatedAt)}
        </p>
      </section>
    </div>
  );
}

function ActivityList({ activity }: { activity: ActivityEventView[] }) {
  if (activity.length === 0) return <p className="text-sm text-muted">No activity yet.</p>;
  return (
    <ol className="grid gap-3">
      {activity.map((event) => (
        <li key={event.id} className="text-[13px]">
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
  );
}

function ChildList({
  projectKey,
  type,
  childIssues,
}: {
  projectKey: string;
  type: IssueDetail["type"];
  childIssues: IssueListItem[];
}) {
  if (type === "SUB_TASK") {
    return <p className="text-sm text-muted">Sub-tasks cannot contain other work.</p>;
  }
  if (childIssues.length === 0) {
    return (
      <p className="text-sm text-muted">
        No {ISSUE_TYPE_LABELS[type] === "Task" ? "sub-tasks" : "children"} yet. Add one from the hierarchy row.
      </p>
    );
  }
  return (
    <ul className="grid gap-1">
      {childIssues.map((child) => (
        <li key={child.id}>
          <Link href={`/projects/${projectKey}/issues/${child.number}`} className="flex items-baseline gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-surface-3">
            <span className="font-mono text-xs text-muted">{child.key}</span>
            <span>{child.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Deferred({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-md py-6">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
