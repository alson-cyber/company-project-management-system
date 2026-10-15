import type { IssuePriority, IssueStatus, IssueType } from "@/generated/prisma/enums";
import type { IssueListItem } from "@/modules/issues/issue.queries";

export interface IssueTreeFilter {
  query: string;
  type: IssueType | "";
  status: IssueStatus | "";
  priority: IssuePriority | "";
  /** Empty means any assignee. "unassigned" matches issues with no assignee. */
  assigneeId: string;
}

export const EMPTY_ISSUE_FILTER: IssueTreeFilter = {
  query: "",
  type: "",
  status: "",
  priority: "",
  assigneeId: "",
};

export function isFilterActive(filter: IssueTreeFilter): boolean {
  return Boolean(filter.query.trim() || filter.type || filter.status || filter.priority || filter.assigneeId);
}

function matches(node: IssueListItem, filter: IssueTreeFilter): boolean {
  const query = filter.query.trim().toLowerCase();
  const queryOk =
    !query || node.key.toLowerCase().includes(query) || node.title.toLowerCase().includes(query);
  const typeOk = !filter.type || node.type === filter.type;
  const statusOk = !filter.status || node.status === filter.status;
  const priorityOk = !filter.priority || node.priority === filter.priority;
  const assigneeOk =
    !filter.assigneeId ||
    (filter.assigneeId === "unassigned" ? node.assignee === null : node.assignee?.id === filter.assigneeId);
  return queryOk && typeOk && statusOk && priorityOk && assigneeOk;
}

/**
 * Keeps a match and its ancestor chain so a filtered child still shows where it sits.
 * A matching parent keeps its full subtree.
 */
export function filterIssueTree(nodes: readonly IssueListItem[], filter: IssueTreeFilter): IssueListItem[] {
  if (!isFilterActive(filter)) return [...nodes];

  const walk = (node: IssueListItem): IssueListItem | null => {
    if (matches(node, filter)) return node;
    const children = node.children.map(walk).filter((child): child is IssueListItem => child !== null);
    if (children.length === 0) return null;
    return { ...node, children };
  };

  return nodes.map(walk).filter((node): node is IssueListItem => node !== null);
}

export interface VisibleIssueRow {
  node: IssueListItem;
  depth: number;
}

export function visibleIssueRows(
  nodes: readonly IssueListItem[],
  isOpen: (id: string) => boolean,
): VisibleIssueRow[] {
  const rows: VisibleIssueRow[] = [];
  const walk = (list: readonly IssueListItem[], depth: number) => {
    for (const node of list) {
      rows.push({ node, depth });
      if (node.children.length > 0 && isOpen(node.id)) walk(node.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return rows;
}

export function parentIds(nodes: readonly IssueListItem[]): string[] {
  const ids: string[] = [];
  const walk = (list: readonly IssueListItem[]) => {
    for (const node of list) {
      if (node.children.length > 0) ids.push(node.id);
      walk(node.children);
    }
  };
  walk(nodes);
  return ids;
}

export function findIssueNode(nodes: readonly IssueListItem[], id: string): IssueListItem | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findIssueNode(node.children, id);
    if (child) return child;
  }
  return null;
}
