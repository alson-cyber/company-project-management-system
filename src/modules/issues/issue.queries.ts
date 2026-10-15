import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";
import { isOverdue } from "@/lib/calendar";
import { issueKey } from "@/modules/issues/issue.keys";
import { childTypeFor } from "@/modules/issues/issue.rules";
import { progressOfIssue, progressOfProject, type Progress, type ProgressIssue } from "@/modules/issues/issue.progress";
import { prisma } from "@/server/db";
import { getEnv } from "@/server/env";
import { assertProjectPermission, hasProjectPermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";
import { visibleProjectsWhere } from "@/modules/projects/project.queries";

export interface IssuePerson {
  id: string;
  name: string;
}

export interface IssueLabelView {
  id: string;
  name: string;
  color: string;
}

export interface IssueListItem {
  id: string;
  key: string;
  number: number;
  type: IssueType;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  parentId: string | null;
  assignee: IssuePerson | null;
  dueDate: Date | null;
  overdue: boolean;
  progress: Progress;
  allowedChildType: IssueType | null;
  children: IssueListItem[];
}

export interface AcceptanceCriterionView {
  id: string;
  text: string;
  isMet: boolean;
  position: number;
}

export interface StoryFieldsView {
  asA: string;
  iWant: string;
  soThat: string;
}

export interface IssueDetail {
  id: string;
  key: string;
  number: number;
  type: IssueType;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  parentId: string | null;
  parent: { id: string; key: string; title: string; type: IssueType } | null;
  project: { id: string; key: string; name: string };
  assignee: IssuePerson | null;
  reporter: IssuePerson;
  creator: IssuePerson;
  dueDate: Date | null;
  overdue: boolean;
  archivedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  progress: Progress;
  labels: IssueLabelView[];
  story: StoryFieldsView | null;
  /** Governing User Story for Tasks and Sub-tasks (read-only context). */
  governingStory: (StoryFieldsView & { issueId: string; key: string; title: string }) | null;
  acceptanceCriteria: AcceptanceCriterionView[];
  allowedChildType: IssueType | null;
  canMutate: boolean;
}

const listSelect = {
  id: true,
  number: true,
  type: true,
  title: true,
  status: true,
  priority: true,
  parentId: true,
  dueDate: true,
  archivedAt: true,
  assignee: { select: { id: true, name: true } },
} satisfies Prisma.IssueSelect;

export async function listProjectIssueTree(
  ctx: AuthContext,
  projectId: string,
  options: { includeArchived?: boolean } = {},
): Promise<{ tree: IssueListItem[]; progress: Progress; projectKey: string }> {
  assertProjectPermission(ctx, "project.view", projectId);

  const project = await prisma.project.findFirst({
    where: { id: projectId, ...visibleProjectsWhere(ctx) },
    select: { id: true, key: true },
  });
  if (!project) return { tree: [], progress: { done: 0, total: 0, percent: 0 }, projectKey: "" };

  const rows = await prisma.issue.findMany({
    where: {
      projectId: project.id,
      ...(options.includeArchived ? {} : { archivedAt: null }),
    },
    select: listSelect,
    orderBy: [{ rank: "asc" }, { number: "asc" }],
  });

  const timeZone = getEnv().COMPANY_TIMEZONE;
  const progressRows: ProgressIssue[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    parentId: row.parentId,
    status: row.status,
    archivedAt: row.archivedAt,
  }));

  const byParent = new Map<string | null, typeof rows>();
  for (const row of rows) {
    const list = byParent.get(row.parentId) ?? [];
    list.push(row);
    byParent.set(row.parentId, list);
  }

  const toItem = (row: (typeof rows)[number]): IssueListItem => ({
    id: row.id,
    key: issueKey(project.key, row.number),
    number: row.number,
    type: row.type,
    title: row.title,
    status: row.status,
    priority: row.priority,
    parentId: row.parentId,
    assignee: row.assignee,
    dueDate: row.dueDate,
    overdue: isOverdue(row.dueDate, row.status, timeZone),
    progress: progressOfIssue(row.id, progressRows),
    allowedChildType: childTypeFor(row.type),
    children: (byParent.get(row.id) ?? []).map(toItem),
  });

  const tree = (byParent.get(null) ?? []).map(toItem);
  return { tree, progress: progressOfProject(progressRows), projectKey: project.key };
}

async function findGoverningStory(
  issue: { id: string; type: IssueType; parentId: string | null },
  projectKey: string,
): Promise<(StoryFieldsView & { issueId: string; key: string; title: string }) | null> {
  if (issue.type === "USER_STORY") return null;
  let currentId = issue.parentId;
  for (let depth = 0; depth < 4 && currentId; depth += 1) {
    const node = await prisma.issue.findFirst({
      where: { id: currentId },
      select: {
        id: true,
        type: true,
        parentId: true,
        number: true,
        title: true,
        story: { select: { asA: true, iWant: true, soThat: true } },
      },
    });
    if (!node) return null;
    if (node.type === "USER_STORY" && node.story) {
      return {
        issueId: node.id,
        key: issueKey(projectKey, node.number),
        title: node.title,
        asA: node.story.asA,
        iWant: node.story.iWant,
        soThat: node.story.soThat,
      };
    }
    currentId = node.parentId;
  }
  return null;
}

export async function getVisibleIssueByNumber(
  ctx: AuthContext,
  projectKey: string,
  number: number,
): Promise<IssueDetail | null> {
  const issue = await prisma.issue.findFirst({
    where: {
      number,
      project: { ...visibleProjectsWhere(ctx), key: projectKey.toUpperCase() },
    },
    select: {
      id: true,
      number: true,
      type: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      parentId: true,
      dueDate: true,
      archivedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, key: true, name: true } },
      assignee: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      parent: { select: { id: true, number: true, title: true, type: true } },
      story: { select: { asA: true, iWant: true, soThat: true } },
      criteria: {
        where: { deletedAt: null },
        orderBy: { position: "asc" },
        select: { id: true, text: true, isMet: true, position: true },
      },
      labels: { select: { label: { select: { id: true, name: true, color: true } } } },
    },
  });
  if (!issue) return null;
  assertProjectPermission(ctx, "project.view", issue.project.id);

  const siblingsAndDescendants = await prisma.issue.findMany({
    where: { projectId: issue.project.id, archivedAt: null },
    select: { id: true, type: true, parentId: true, status: true, archivedAt: true },
  });

  const timeZone = getEnv().COMPANY_TIMEZONE;
  const governingStory = await findGoverningStory(issue, issue.project.key);

  return {
    id: issue.id,
    key: issueKey(issue.project.key, issue.number),
    number: issue.number,
    type: issue.type,
    title: issue.title,
    description: issue.description,
    status: issue.status,
    priority: issue.priority,
    parentId: issue.parentId,
    parent: issue.parent
      ? {
          id: issue.parent.id,
          key: issueKey(issue.project.key, issue.parent.number),
          title: issue.parent.title,
          type: issue.parent.type,
        }
      : null,
    project: issue.project,
    assignee: issue.assignee,
    reporter: issue.reporter,
    creator: issue.createdBy,
    dueDate: issue.dueDate,
    overdue: isOverdue(issue.dueDate, issue.status, timeZone),
    archivedAt: issue.archivedAt,
    completedAt: issue.completedAt,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    progress: progressOfIssue(issue.id, siblingsAndDescendants),
    labels: issue.labels.map((row) => row.label),
    story: issue.story,
    governingStory,
    acceptanceCriteria: issue.criteria,
    allowedChildType: childTypeFor(issue.type),
    canMutate: hasProjectPermission(ctx, "project.participate", issue.project.id),
  };
}

export async function listAssignableMembers(
  ctx: AuthContext,
  projectId: string,
): Promise<Array<{ id: string; name: string }>> {
  assertProjectPermission(ctx, "project.view", projectId);
  const members = await prisma.projectMember.findMany({
    where: { projectId, user: { status: "ACTIVE" } },
    select: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return members.map((member) => member.user);
}

export async function listProjectLabels(ctx: AuthContext, projectId: string): Promise<IssueLabelView[]> {
  assertProjectPermission(ctx, "project.view", projectId);
  return prisma.label.findMany({
    where: { projectId },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });
}
