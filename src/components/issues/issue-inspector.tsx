"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { IssueType } from "@/generated/prisma/enums";
import { patchIssueAction, setLabelsAction, setStoryFieldsAction } from "@/app/(app)/issues/actions";
import { AttachmentsPanel, CommentsPanel, NotesPanel } from "@/components/issues/collaboration-panels";
import { CreateIssueForm } from "@/components/issues/create-issue-form";
import { CriteriaEditor } from "@/components/issues/criteria-editor";
import { ArchiveRestoreForm } from "@/components/issues/issue-forms";
import { type InspectorSection } from "@/components/issues/inspector-section";
import { useDraft } from "@/components/issues/use-draft";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/components/ui/cn";
import { controlClasses, TextArea, TextInput } from "@/components/ui/field";
import { formatDate, formatDateTime, toDate } from "@/components/ui/format";
import {
  ISSUE_TYPE_STYLES,
  IssuePriorityBadge,
  IssueStatusBadge,
  IssueTypeBadge,
} from "@/components/ui/issue-badges";
import { ProgressRing } from "@/components/ui/progress-ring";
import { calendarDayUtc } from "@/lib/calendar";
import {
  activityDetail,
  activityKind,
  describeActivity,
  type ActivityEventView,
} from "@/modules/activity/activity.format";
import type { AttachmentView, CommentView, NoteView } from "@/modules/collaboration/collaboration.queries";
import {
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
} from "@/modules/issues/issue.constants";
import type { IssueDetail, IssueListItem } from "@/modules/issues/issue.queries";

export type { InspectorSection } from "@/components/issues/inspector-section";

const menuItemClass =
  "flex w-full cursor-pointer items-center rounded-md px-2 py-2 text-left text-sm outline-none data-[highlighted]:bg-surface-3";

export function IssueInspector({
  issue,
  members,
  activity,
  childIssues,
  notes,
  comments,
  attachments,
  viewer,
  initialSection,
}: {
  issue: IssueDetail;
  members: Array<{ id: string; name: string }>;
  activity: ActivityEventView[];
  childIssues: IssueListItem[];
  notes: NoteView[];
  comments: CommentView[];
  attachments: AttachmentView[];
  viewer: { id: string; canModerate: boolean };
  initialSection: InspectorSection;
}) {
  const pathname = usePathname();
  const { pendingField, message, patch } = useIssuePatch(issue);
  const [section, setSection] = useState(initialSection);
  const [syncedSection, setSyncedSection] = useState(initialSection);
  if (initialSection !== syncedSection) {
    setSyncedSection(initialSection);
    setSection(initialSection);
  }

  const editable = issue.canMutate && !issue.archivedAt;
  const childLabel = childTabLabel(issue.type);
  const tabs: Array<{ id: InspectorSection; label: string; count?: number }> = [
    { id: "details", label: "Details" },
    { id: "notes", label: "Notes", count: notes.length },
    { id: "attachments", label: "Attachments", count: attachments.length },
    { id: "comments", label: "Comments", count: comments.length },
    { id: "activity", label: "Activity", count: activity.length },
    { id: "children", label: childLabel, count: issue.type === "SUB_TASK" ? undefined : childIssues.length },
  ];

  function selectSection(next: InspectorSection) {
    setSection(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "details") params.delete("section");
    else params.set("section", next);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = tabs.findIndex((tab) => tab.id === section);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const tab = tabs[next];
    if (!tab) return;
    selectSection(tab.id);
    document.getElementById(`issue-tab-${tab.id}`)?.focus();
  }

  const target = {
    id: issue.id,
    number: issue.number,
    projectKey: issue.project.key,
    canMutate: issue.canMutate,
    archived: Boolean(issue.archivedAt),
  };

  return (
    <div className="flex min-h-0 animate-slide-in flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-surface px-4 py-4 sm:px-5">
        <span
          aria-hidden="true"
          className={cn("absolute inset-x-0 top-0 h-[3px]", ISSUE_TYPE_STYLES[issue.type].solid)}
        />
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            href={`/projects/${issue.project.key}/issues`}
            scroll={false}
            className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-muted transition-colors hover:text-ink lg:size-8 lg:justify-center lg:hover:bg-surface-3"
            title="Close (Esc)"
          >
            <span className="lg:hidden">
              <span aria-hidden="true">← </span>Back to hierarchy
            </span>
            <span className="hidden lg:inline">
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span className="sr-only">Close</span>
            </span>
          </Link>
          {issue.canMutate ? (
            <details className="relative">
              <summary
                className="grid size-8 cursor-pointer list-none place-items-center rounded-md text-muted transition-colors hover:bg-surface-3 hover:text-ink [&::-webkit-details-marker]:hidden"
                title="More actions"
              >
                <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                  <circle cx="3.5" cy="8" r="1.3" fill="currentColor" />
                  <circle cx="8" cy="8" r="1.3" fill="currentColor" />
                  <circle cx="12.5" cy="8" r="1.3" fill="currentColor" />
                </svg>
                <span className="sr-only">More actions</span>
              </summary>
              <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-line bg-surface p-3 shadow-pop">
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
          {issue.overdue ? <span className="text-xs font-semibold text-danger">Overdue</span> : null}
          {issue.archivedAt ? <span className="text-xs font-semibold text-warning">Archived</span> : null}
        </div>

        <TitleEditor
          issue={issue}
          editable={editable}
          pending={pendingField === "title"}
          onSave={(title) => patch("title", { title })}
        />

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(6.5rem,max-content))] items-start gap-x-4 gap-y-3">
          <FieldLabel label="Status">
            <ChoiceMenu
              label={`Status, ${ISSUE_STATUS_LABELS[issue.status]}`}
              disabled={!editable || pendingField === "status"}
              trigger={<IssueStatusBadge status={issue.status} />}
            >
              {ISSUE_STATUSES.map((status) => (
                <DropdownMenu.Item
                  key={status}
                  className={menuItemClass}
                  onSelect={() => void patch("status", { status })}
                >
                  {ISSUE_STATUS_LABELS[status]}
                </DropdownMenu.Item>
              ))}
            </ChoiceMenu>
          </FieldLabel>
          <FieldLabel label="Priority">
            <ChoiceMenu
              label={`Priority, ${ISSUE_PRIORITY_LABELS[issue.priority]}`}
              disabled={!editable || pendingField === "priority"}
              trigger={<IssuePriorityBadge priority={issue.priority} />}
            >
              {ISSUE_PRIORITIES.map((priority) => (
                <DropdownMenu.Item
                  key={priority}
                  className={menuItemClass}
                  onSelect={() => void patch("priority", { priority })}
                >
                  {ISSUE_PRIORITY_LABELS[priority]}
                </DropdownMenu.Item>
              ))}
            </ChoiceMenu>
          </FieldLabel>
          <FieldLabel label="Assignee">
            <AssigneeMenu
              issue={issue}
              members={members}
              disabled={!editable || pendingField === "assignee"}
              onSelect={(assigneeId) => void patch("assignee", { assigneeId })}
            />
          </FieldLabel>
        </div>
        {issue.status !== "DONE" &&
        issue.progress.total > 0 &&
        issue.progress.done === issue.progress.total ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-[13px] text-success">
            <span className="min-w-0 flex-1">
              Everything under this is done. It stays open until someone marks it Done.
            </span>
            {editable ? (
              <button
                type="button"
                disabled={pendingField === "status"}
                className="h-7 shrink-0 rounded-md bg-success px-2.5 text-xs font-medium text-surface transition-transform active:scale-[0.97] disabled:opacity-60"
                onClick={() => void patch("status", { status: "DONE" })}
              >
                Mark as Done
              </button>
            ) : null}
          </div>
        ) : null}
        {message ? (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            className={cn(
              "mt-2 flex items-center gap-1.5 text-[13px] font-medium",
              message.tone === "error"
                ? "text-danger"
                : message.tone === "celebrate"
                  ? "text-success"
                  : "text-muted",
            )}
          >
            {message.tone === "celebrate" ? (
              <span
                className="grid size-4 animate-pop place-items-center rounded-full bg-success text-white"
                aria-hidden="true"
              >
                <svg viewBox="0 0 16 16" className="size-2.5">
                  <path
                    d="m3.5 8.4 3 3 6-6.6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : null}
            {message.text}
          </p>
        ) : null}
      </header>

      {issue.governingStory ? (
        <GoverningStory projectKey={issue.project.key} story={issue.governingStory} />
      ) : null}

      <div
        role="tablist"
        aria-label="Issue sections"
        className="flex gap-0.5 overflow-x-auto border-b border-line px-3 [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] [scrollbar-width:none]"
        onKeyDown={onTabKeyDown}
      >
        {tabs.map((tab) => {
          const selected = section === tab.id;
          const name = tab.count ? `${tab.label} ${tab.count}` : tab.label;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`issue-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`issue-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              aria-label={name}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2 py-3 text-[13px] transition-colors",
                selected
                  ? "border-accent font-semibold text-ink"
                  : "border-transparent text-muted hover:text-ink",
              )}
              onClick={() => selectSection(tab.id)}
            >
              {tab.label}
              {tab.count ? (
                <span className="rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-muted">
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section
          role="tabpanel"
          id="issue-panel-details"
          aria-labelledby="issue-tab-details"
          hidden={section !== "details"}
          className="px-4 py-4 sm:px-5"
        >
          <Details
            issue={issue}
            editable={editable}
            childCount={childIssues.length}
            childLabel={childLabel}
            onOpenChildren={() => selectSection("children")}
            patch={patch}
            pendingField={pendingField}
          />
        </section>
        <section
          role="tabpanel"
          id="issue-panel-notes"
          aria-labelledby="issue-tab-notes"
          hidden={section !== "notes"}
          className="px-4 py-4 sm:px-5"
        >
          <NotesPanel issue={target} notes={notes} viewerId={viewer.id} canModerate={viewer.canModerate} />
        </section>
        <section
          role="tabpanel"
          id="issue-panel-attachments"
          aria-labelledby="issue-tab-attachments"
          hidden={section !== "attachments"}
          className="px-4 py-4 sm:px-5"
        >
          <AttachmentsPanel issue={target} attachments={attachments} />
        </section>
        <section
          role="tabpanel"
          id="issue-panel-comments"
          aria-labelledby="issue-tab-comments"
          hidden={section !== "comments"}
          className="px-4 py-4 sm:px-5"
        >
          <CommentsPanel
            issue={target}
            comments={comments}
            viewerId={viewer.id}
            canModerate={viewer.canModerate}
          />
        </section>
        <section
          role="tabpanel"
          id="issue-panel-activity"
          aria-labelledby="issue-tab-activity"
          hidden={section !== "activity"}
          className="px-4 py-4 sm:px-5"
        >
          <ActivityList activity={activity} />
        </section>
        <section
          role="tabpanel"
          id="issue-panel-children"
          aria-labelledby="issue-tab-children"
          hidden={section !== "children"}
          className="px-4 py-4 sm:px-5"
        >
          <ChildWork issue={issue} childIssues={childIssues} members={members} label={childLabel} />
        </section>
      </div>
    </div>
  );
}

function useIssuePatch(issue: IssueDetail) {
  const router = useRouter();
  const [pendingField, setPendingField] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "celebrate"; text: string } | null>(
    null,
  );

  async function patch(field: string, values: Record<string, string>) {
    setPendingField(field);
    setMessage(null);
    const form = new FormData();
    form.set("issueId", issue.id);
    form.set("projectKey", issue.project.key);
    form.set("issueNumber", String(issue.number));
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    const result = await patchIssueAction(null, form);
    setPendingField(null);
    if (!result?.ok) {
      setMessage({ tone: "error", text: result?.error.message ?? "Could not save." });
      return false;
    }
    const finished = values.status === "DONE" && result.data.changed !== false;
    setMessage(
      finished
        ? { tone: "celebrate", text: "Done. Nice work!" }
        : { tone: "success", text: result.data.changed === false ? "No changes to save." : "Saved." },
    );
    router.refresh();
    return true;
  }

  return { pendingField, message, patch };
}

function TitleEditor({
  issue,
  editable,
  pending,
  onSave,
}: {
  issue: IssueDetail;
  editable: boolean;
  pending: boolean;
  onSave: (title: string) => Promise<boolean>;
}) {
  const draft = useDraft(`${issue.id}:title`, issue.title);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="group mt-2 flex items-start gap-2">
        <h2 className="min-w-0 flex-1 text-xl font-semibold tracking-[-0.02em]">
          {editable ? (
            <span
              className="-mx-1.5 block cursor-text rounded-md px-1.5 transition-colors hover:bg-surface-3"
              title="Click to edit"
              onClick={() => {
                draft.markClean(issue.title);
                setEditing(true);
              }}
            >
              {issue.title}
            </span>
          ) : (
            issue.title
          )}
        </h2>
        {editable ? (
          <button
            type="button"
            aria-label="Edit title"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted opacity-60 transition-opacity hover:bg-surface-3 hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
            onClick={() => {
              draft.markClean(issue.title);
              setEditing(true);
            }}
          >
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
              <path
                d="M10.8 2.7a1.6 1.6 0 0 1 2.3 2.3l-7.4 7.4-3 .7.7-3z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-2">
      <h2 className="sr-only">{issue.title}</h2>
      <label className="sr-only" htmlFor="issue-title">
        Issue title
      </label>
      <TextInput
        id="issue-title"
        value={draft.value}
        disabled={pending}
        className="text-base font-semibold"
        onChange={(event) => draft.setValue(event.target.value)}
        onBlur={() => {
          const next = draft.value.trim();
          if (!next || next === issue.title) {
            draft.markClean(issue.title);
            setEditing(false);
            return;
          }
          void onSave(next).then((ok) => {
            if (ok) {
              draft.markClean(next);
              setEditing(false);
            }
          });
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            draft.markClean(issue.title);
            setEditing(false);
          }
        }}
        autoFocus
      />
    </div>
  );
}

function ChoiceMenu({
  label,
  disabled,
  trigger,
  children,
}: {
  label: string;
  disabled?: boolean;
  trigger: ReactNode;
  children: ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={disabled}
        aria-label={label}
        className="inline-flex h-9 items-center rounded-md px-1.5 hover:bg-surface-3 disabled:opacity-60"
      >
        {trigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-44 rounded-lg border border-line bg-surface p-1"
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function AssigneeMenu({
  issue,
  members,
  disabled,
  onSelect,
}: {
  issue: IssueDetail;
  members: Array<{ id: string; name: string }>;
  disabled?: boolean;
  onSelect: (assigneeId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = members.filter((member) => member.name.toLowerCase().includes(query.trim().toLowerCase()));
  const current = issue.assignee?.name ?? "Unassigned";

  return (
    <DropdownMenu.Root onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenu.Trigger
        disabled={disabled}
        aria-label={`Assignee, ${current}`}
        className="inline-flex h-9 items-center gap-2 rounded-md px-1.5 text-[13px] hover:bg-surface-3 disabled:opacity-60"
      >
        {issue.assignee ? <Avatar name={issue.assignee.name} size="sm" className="size-6 text-xs" /> : null}
        <span>{current}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-64 rounded-lg border border-line bg-surface p-1"
        >
          <div className="p-1">
            <input
              aria-label="Find a person"
              value={query}
              placeholder="Find a person"
              className={cn(controlClasses, "h-9")}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>
          <DropdownMenu.Item className={menuItemClass} onSelect={() => onSelect("")}>
            Unassigned
          </DropdownMenu.Item>
          {filtered.map((member) => (
            <DropdownMenu.Item key={member.id} className={menuItemClass} onSelect={() => onSelect(member.id)}>
              {member.name}
            </DropdownMenu.Item>
          ))}
          {filtered.length === 0 ? <p className="px-2 py-2 text-sm text-muted">No matches.</p> : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function GoverningStory({
  projectKey,
  story,
}: {
  projectKey: string;
  story: NonNullable<IssueDetail["governingStory"]>;
}) {
  return (
    <aside className="border-b border-line px-4 py-3 sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Part of</p>
      <p className="mt-1 text-sm">
        <Link
          href={issueHref(projectKey, story.key)}
          scroll={false}
          className="font-medium"
          aria-label={`Open governing story ${story.key}, ${story.title}`}
        >
          {story.key} · {story.title}
        </Link>
      </p>
      <div className="mt-2 text-sm leading-relaxed text-muted">
        <p>As a {story.asA}</p>
        <p>I want {story.iWant}</p>
        <p>So that {story.soThat}</p>
      </div>
    </aside>
  );
}

function Details({
  issue,
  editable,
  childCount,
  childLabel,
  onOpenChildren,
  patch,
  pendingField,
}: {
  issue: IssueDetail;
  editable: boolean;
  childCount: number;
  childLabel: string;
  onOpenChildren: () => void;
  patch: (field: string, values: Record<string, string>) => Promise<boolean>;
  pendingField: string | null;
}) {
  return (
    <div className="grid gap-6">
      {issue.type === "USER_STORY" && issue.story ? (
        <StoryDocument issue={issue} story={issue.story} editable={editable} />
      ) : null}
      <DescriptionEditor
        issue={issue}
        editable={editable}
        pending={pendingField === "description"}
        onSave={(description) => patch("description", { description })}
      />
      {issue.type === "USER_STORY" ? (
        <CriteriaEditor
          issueId={issue.id}
          projectKey={issue.project.key}
          issueNumber={issue.number}
          criteria={issue.acceptanceCriteria}
          canMutate={editable}
        />
      ) : null}
      {issue.type !== "SUB_TASK" ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          {issue.progress.total > 0 ? (
            <ProgressRing
              percent={issue.progress.percent}
              size={22}
              label={`${issue.progress.percent}% complete`}
            />
          ) : null}
          <button type="button" className="font-medium text-accent-strong" onClick={onOpenChildren}>
            {childCount === 0
              ? `No ${childLabel.toLowerCase()} yet`
              : `${childCount} ${(childCount === 1 ? singularChildLabel(childLabel) : childLabel).toLowerCase()}`}
          </button>
          {issue.progress.total > 0 ? (
            <span className="text-muted">
              · {issue.progress.done}/{issue.progress.total} done
            </span>
          ) : null}
        </p>
      ) : null}
      <Properties issue={issue} editable={editable} pendingField={pendingField} patch={patch} />
    </div>
  );
}

function StoryDocument({
  issue,
  story,
  editable,
}: {
  issue: IssueDetail;
  story: NonNullable<IssueDetail["story"]>;
  editable: boolean;
}) {
  const router = useRouter();
  const asA = useDraft(`${issue.id}:asA`, story.asA);
  const iWant = useDraft(`${issue.id}:iWant`, story.iWant);
  const soThat = useDraft(`${issue.id}:soThat`, story.soThat);
  const [editing, setEditing] = useState<"asA" | "iWant" | "soThat" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(next: { asA: string; iWant: string; soThat: string }) {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("issueId", issue.id);
    form.set("projectKey", issue.project.key);
    form.set("issueNumber", String(issue.number));
    form.set("asA", next.asA);
    form.set("iWant", next.iWant);
    form.set("soThat", next.soThat);
    const result = await setStoryFieldsAction(null, form);
    setPending(false);
    if (!result?.ok) {
      setError(result?.error.message ?? "Could not save the story.");
      return false;
    }
    asA.markClean(next.asA);
    iWant.markClean(next.iWant);
    soThat.markClean(next.soThat);
    setEditing(null);
    router.refresh();
    return true;
  }

  const lines = [
    { key: "asA" as const, lead: "As a", value: asA.value, setValue: asA.setValue },
    { key: "iWant" as const, lead: "I want", value: iWant.value, setValue: iWant.setValue },
    { key: "soThat" as const, lead: "So that", value: soThat.value, setValue: soThat.setValue },
  ];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">User story</p>
      <div className="mt-2 grid gap-1">
        {lines.map((line) =>
          editing === line.key ? (
            <div key={line.key}>
              <label htmlFor={`story-${line.key}`} className="text-[13px] text-muted">
                {line.lead}
              </label>
              <TextInput
                id={`story-${line.key}`}
                value={line.value}
                disabled={pending}
                autoFocus
                onChange={(event) => line.setValue(event.target.value)}
                onBlur={() => {
                  void save({ asA: asA.value, iWant: iWant.value, soThat: soThat.value });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setEditing(null);
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void save({ asA: asA.value, iWant: iWant.value, soThat: soThat.value });
                  }
                }}
              />
            </div>
          ) : (
            <p key={line.key} className="text-[15px] leading-relaxed">
              <span className="text-muted">{line.lead} </span>
              {editable ? (
                <button type="button" className="text-left" onClick={() => setEditing(line.key)}>
                  {line.value}
                  <span className="sr-only">, edit {line.lead}</span>
                </button>
              ) : (
                line.value
              )}
            </p>
          ),
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function DescriptionEditor({
  issue,
  editable,
  pending,
  onSave,
}: {
  issue: IssueDetail;
  editable: boolean;
  pending: boolean;
  onSave: (description: string) => Promise<boolean>;
}) {
  const draft = useDraft(`${issue.id}:description`, issue.description ?? "");
  const [editing, setEditing] = useState(draft.dirty);

  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold">Description</h3>
      {editing && editable ? (
        <>
          <label className="sr-only" htmlFor="issue-description">
            Description
          </label>
          <TextArea
            id="issue-description"
            rows={6}
            value={draft.value}
            disabled={pending}
            onChange={(event) => draft.setValue(event.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="text-[13px] font-semibold text-accent-strong"
              disabled={pending}
              onClick={() => {
                void onSave(draft.value).then((ok) => {
                  if (ok) {
                    draft.markClean(draft.value);
                    setEditing(false);
                  }
                });
              }}
            >
              {pending ? "Saving…" : "Save description"}
            </button>
            <button
              type="button"
              className="text-[13px] font-medium text-muted"
              onClick={() => {
                draft.markClean(issue.description ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className="whitespace-pre-wrap text-left text-sm leading-relaxed disabled:cursor-default"
          disabled={!editable}
          onClick={() => editable && setEditing(true)}
        >
          {draft.value || <span className="text-muted">No description.</span>}
          {editable ? <span className="sr-only"> Edit description</span> : null}
        </button>
      )}
    </section>
  );
}

function Properties({
  issue,
  editable,
  pendingField,
  patch,
}: {
  issue: IssueDetail;
  editable: boolean;
  pendingField: string | null;
  patch: (field: string, values: Record<string, string>) => Promise<boolean>;
}) {
  const dueDate = toDate(issue.dueDate);
  const dueServer = dueDate ? calendarDayUtc(dueDate) : "";
  const due = useDraft(`${issue.id}:due`, dueServer);
  const startDate = toDate(issue.plannedStartDate);
  const startServer = startDate ? calendarDayUtc(startDate) : "";
  const start = useDraft(`${issue.id}:start`, startServer);
  const labelServer = issue.labels.map((label) => label.name).join(", ");
  const labels = useDraft(`${issue.id}:labels`, labelServer);
  const [editingLabels, setEditingLabels] = useState(false);
  const router = useRouter();
  const [labelError, setLabelError] = useState<string | null>(null);

  return (
    <dl className="border-t border-line">
      <Property label="Reporter">{issue.reporter.name}</Property>
      {issue.creator.id !== issue.reporter.id ? (
        <Property label="Creator">{issue.creator.name}</Property>
      ) : null}
      <Property label="Parent">
        {issue.parent ? (
          <Link href={issueHref(issue.project.key, issue.parent.key)} scroll={false} className="font-medium">
            {issue.parent.key} · {issue.parent.title}
          </Link>
        ) : (
          <span className="text-muted">None</span>
        )}
      </Property>
      <Property label="Project">{issue.project.name}</Property>
      <Property label="Planned start">
        {editable ? (
          <input
            type="date"
            aria-label="Planned start"
            value={start.value}
            disabled={pendingField === "start"}
            className={cn(controlClasses, "h-11 max-w-52 sm:h-9")}
            onChange={(event) => {
              const value = event.target.value;
              start.setValue(value);
              void patch("start", { plannedStartDate: value }).then((ok) => {
                if (ok) start.markClean(value);
                else start.markClean(startServer);
              });
            }}
          />
        ) : (
          <span>{startServer ? formatDate(issue.plannedStartDate) : "None"}</span>
        )}
      </Property>
      <Property label="Due date">
        {editable ? (
          <input
            type="date"
            aria-label="Due date"
            value={due.value}
            disabled={pendingField === "due"}
            className={cn(controlClasses, "h-11 max-w-52 sm:h-9")}
            onChange={(event) => {
              const value = event.target.value;
              due.setValue(value);
              void patch("due", { dueDate: value }).then((ok) => {
                if (ok) due.markClean(value);
                else due.markClean(dueServer);
              });
            }}
          />
        ) : (
          <span>{dueServer ? formatDate(issue.dueDate) : "None"}</span>
        )}
      </Property>
      <Property label="Labels">
        {editingLabels && editable ? (
          <div className="grid gap-2">
            <label className="sr-only" htmlFor="issue-labels">
              Labels
            </label>
            <TextInput
              id="issue-labels"
              value={labels.value}
              onChange={(event) => labels.setValue(event.target.value)}
              placeholder="Comma-separated labels"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[13px] font-semibold text-accent-strong"
                onClick={() => {
                  setLabelError(null);
                  const form = new FormData();
                  form.set("issueId", issue.id);
                  form.set("projectKey", issue.project.key);
                  form.set("issueNumber", String(issue.number));
                  form.set("labels", labels.value);
                  void setLabelsAction(null, form).then((result) => {
                    if (!result?.ok) {
                      setLabelError(result?.error.message ?? "Could not save labels.");
                      return;
                    }
                    labels.markClean(labels.value);
                    setEditingLabels(false);
                    router.refresh();
                  });
                }}
              >
                Save labels
              </button>
              <button
                type="button"
                className="text-[13px] font-medium text-muted"
                onClick={() => {
                  labels.markClean(labelServer);
                  setEditingLabels(false);
                }}
              >
                Cancel
              </button>
            </div>
            {labelError ? (
              <p role="alert" className="text-[13px] font-medium text-danger">
                {labelError}
              </p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="text-left disabled:cursor-default"
            disabled={!editable}
            onClick={() => editable && setEditingLabels(true)}
          >
            {issue.labels.length > 0 ? (
              issue.labels.map((label) => label.name).join(", ")
            ) : (
              <span className="text-muted">None</span>
            )}
            {editable ? <span className="sr-only"> Edit labels</span> : null}
          </button>
        )}
      </Property>
      <Property label="Created">{formatDateTime(issue.createdAt)}</Property>
      <Property label="Updated">{formatDateTime(issue.updatedAt)}</Property>
    </dl>
  );
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center sm:gap-3">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function ActivityList({ activity }: { activity: ActivityEventView[] }) {
  if (activity.length === 0) return <p className="text-sm text-muted">No activity yet.</p>;
  return (
    <ol className="grid">
      {activity.map((event) => {
        const detail = activityDetail(event);
        const occurred = toDate(event.occurredAt);
        return (
          <li
            key={event.id}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 border-b border-line py-3"
          >
            <span className="pt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-2">
              {activityKind(event)}
            </span>
            <div>
              <p className="text-sm">
                <span className="font-semibold">{event.actorName ?? "System"}</span>{" "}
                <span className="text-muted">{describeActivity(event)}</span>
              </p>
              {detail ? <p className="mt-0.5 text-sm text-ink">{detail}</p> : null}
              {occurred ? (
                <time className="mt-0.5 block text-xs text-muted-2" dateTime={occurred.toISOString()}>
                  {formatDateTime(occurred)}
                </time>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ChildWork({
  issue,
  childIssues,
  members,
  label,
}: {
  issue: IssueDetail;
  childIssues: IssueListItem[];
  members: Array<{ id: string; name: string }>;
  label: string;
}) {
  if (issue.type === "SUB_TASK") {
    return <p className="text-sm text-muted">Sub-tasks do not contain other work.</p>;
  }
  return (
    <div className="grid gap-4">
      {issue.progress.total > 0 ? (
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <ProgressRing percent={issue.progress.percent} size={20} />
          {issue.progress.done} / {issue.progress.total} done
        </p>
      ) : null}
      {childIssues.length === 0 ? <p className="text-sm text-muted">No {label.toLowerCase()} yet.</p> : null}
      <ul className="grid">
        {childIssues.map((child) => (
          <li key={child.id} className="border-b border-line">
            <Link
              href={`/projects/${issue.project.key}/issues/${child.number}`}
              scroll={false}
              className="grid gap-1 py-2.5 hover:bg-surface-2"
            >
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-muted">{child.key}</span>
                <span className="min-w-0 flex-1 text-sm font-medium">{child.title}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <IssueStatusBadge status={child.status} />
                <span>{child.assignee?.name ?? "Unassigned"}</span>
                {child.progress.total > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <ProgressRing percent={child.progress.percent} size={14} />
                    {child.progress.done}/{child.progress.total}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {issue.allowedChildType && issue.canMutate && !issue.archivedAt ? (
        <CreateIssueForm
          projectId={issue.project.id}
          type={issue.allowedChildType}
          parentId={issue.id}
          members={members}
        />
      ) : null}
    </div>
  );
}

/** A small caption above an inline control in the panel header. */
function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function singularChildLabel(label: string): string {
  if (label === "Stories") return "Story";
  if (label === "Children") return "Child";
  return label.replace(/s$/, "");
}

function childTabLabel(type: IssueType): string {
  if (type === "EPIC") return "Stories";
  if (type === "USER_STORY") return "Tasks";
  if (type === "TASK") return "Sub-tasks";
  return "Children";
}

function issueHref(projectKey: string, issueKeyValue: string): string {
  const number = issueKeyValue.slice(projectKey.length + 1);
  return `/projects/${projectKey}/issues/${number}`;
}
