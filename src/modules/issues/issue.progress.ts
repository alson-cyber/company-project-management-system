import type { IssueStatus, IssueType } from "@/generated/prisma/enums";

/**
 * Progress is derived from executable work, never stored.
 *
 * Executable items:
 * - Every non-archived Sub-task.
 * - Every non-archived Task that has no non-archived Sub-task children.
 *
 * Epics and User Stories are containers and never count as executable units.
 * A Task that has Sub-tasks is also a container for progress (its own status is ignored)
 * so a Task and its Sub-tasks are never double-counted.
 *
 * Task status is independent of Sub-task status: completing every Sub-task does not
 * move the Task to Done, and parent status is never auto-changed.
 *
 * Progress of a container (or a whole project) =
 *   Done executable descendants / all non-archived executable descendants.
 * If there is no executable work, total is 0 and ratio is 0.
 */
export interface ProgressIssue {
  id: string;
  type: IssueType;
  parentId: string | null;
  status: IssueStatus;
  archivedAt: Date | null;
}

export interface Progress {
  done: number;
  total: number;
  /** 0–100, rounded to nearest integer. 0 when total is 0. */
  percent: number;
}

export function isExecutable(issue: ProgressIssue, issues: readonly ProgressIssue[]): boolean {
  if (issue.archivedAt) return false;
  if (issue.type === "SUB_TASK") return true;
  if (issue.type !== "TASK") return false;
  return !issues.some((candidate) => candidate.parentId === issue.id && candidate.type === "SUB_TASK" && !candidate.archivedAt);
}

export function executableIssues(issues: readonly ProgressIssue[]): ProgressIssue[] {
  return issues.filter((issue) => isExecutable(issue, issues));
}

function childrenOf(parentId: string, issues: readonly ProgressIssue[]): ProgressIssue[] {
  return issues.filter((issue) => issue.parentId === parentId);
}

/** All descendants of `rootId`, not including the root itself. */
export function descendantsOf(rootId: string, issues: readonly ProgressIssue[]): ProgressIssue[] {
  const result: ProgressIssue[] = [];
  const stack = childrenOf(rootId, issues);
  while (stack.length > 0) {
    const next = stack.pop();
    if (!next) continue;
    result.push(next);
    stack.push(...childrenOf(next.id, issues));
  }
  return result;
}

export function progressFromExecutable(items: readonly ProgressIssue[]): Progress {
  const total = items.length;
  const done = items.filter((item) => item.status === "DONE").length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function progressOfIssue(issueId: string, issues: readonly ProgressIssue[]): Progress {
  const subset = descendantsOf(issueId, issues).filter((issue) => isExecutable(issue, issues));
  return progressFromExecutable(subset);
}

export function progressOfProject(issues: readonly ProgressIssue[]): Progress {
  return progressFromExecutable(executableIssues(issues));
}
