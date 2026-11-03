import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import type { IssuePriority } from "@/generated/prisma/enums";
import { ProjectBoard } from "@/components/projects/project-board";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { FilterSelect, filterLabelClass, FilterApplyButton } from "@/components/ui/filter-fields";
import { ISSUE_PRIORITIES, ISSUE_PRIORITY_LABELS, ISSUE_TYPE_LABELS } from "@/modules/issues/issue.constants";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import {
  boardCards,
  filterBoardCards,
  groupBoardCards,
  type BoardFilter,
  type BoardGroupMode,
} from "@/modules/projects/workspace.model";
import { listProjectWorkspaceIssues } from "@/modules/projects/workspace.queries";
import { hasProjectPermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";
import { visibleProject } from "../guard";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string }> }): Promise<Metadata> {
  const { project } = await visibleProject((await params).projectKey);
  return { title: `${project.key} · Board` };
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function groupMode(value: string): BoardGroupMode {
  if (value === "story" || value === "epic") return value;
  return "none";
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectKey } = await params;
  const query = await searchParams;
  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();

  const issues = await listProjectWorkspaceIssues(ctx, project.id);
  const cards = boardCards(issues);
  const labels = [...new Set(cards.flatMap((card) => card.labels))].sort((a, b) => a.localeCompare(b));
  const filter: BoardFilter = {
    assigneeId: first(query.assignee),
    priority: ISSUE_PRIORITIES.includes(first(query.priority) as IssuePriority) ? (first(query.priority) as IssuePriority) : "",
    type: first(query.type) === "TASK" || first(query.type) === "SUB_TASK" ? (first(query.type) as "TASK" | "SUB_TASK") : "",
    label: first(query.label),
  };
  const mode = groupMode(first(query.group));
  const groups = groupBoardCards(filterBoardCards(cards, filter), mode);
  const filtering = Boolean(filter.assigneeId || filter.priority || filter.type || filter.label);

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="board" />
      <form method="get" aria-label="Board filters" className="mb-4 flex flex-wrap items-end gap-2">
        <Filter label="Group" name="group" defaultValue={mode}>
          <option value="none">No grouping</option>
          <option value="story">User story</option>
          <option value="epic">Epic</option>
        </Filter>
        <Filter label="Assignee" name="assignee" defaultValue={filter.assigneeId}>
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {project.members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </Filter>
        <Filter label="Priority" name="priority" defaultValue={filter.priority}>
          <option value="">Any priority</option>
          {ISSUE_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {ISSUE_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Filter>
        <Filter label="Type" name="type" defaultValue={filter.type}>
          <option value="">Tasks and sub-tasks</option>
          <option value="TASK">{ISSUE_TYPE_LABELS.TASK}</option>
          <option value="SUB_TASK">{ISSUE_TYPE_LABELS.SUB_TASK}</option>
        </Filter>
        <Filter label="Label" name="label" defaultValue={filter.label}>
          <option value="">Any label</option>
          {labels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </Filter>
        <FilterApplyButton />
        {filtering || mode !== "none" ? (
          <a href={`/projects/${project.key}/board`} className="h-10 px-2 text-[13px] leading-10 text-muted hover:text-ink">
            Reset
          </a>
        ) : null}
      </form>
      <p className="mb-3 text-xs text-muted">
        Tasks and sub-tasks only. Drag a card, or use Move, to change its status. Epics and user stories stay in the hierarchy.
      </p>
      {cards.length === 0 ? <p className="mb-3 text-sm text-muted">This project has no tasks or sub-tasks yet.</p> : null}
      <ProjectBoard projectKey={project.key} groups={groups} canMutate={hasProjectPermission(ctx, "project.participate", project.id)} />
    </>
  );
}

function Filter({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <label className={`${filterLabelClass} min-w-44`}>
      {label}
      <FilterSelect name={name} defaultValue={defaultValue} aria-label={label}>
        {children}
      </FilterSelect>
    </label>
  );
}
