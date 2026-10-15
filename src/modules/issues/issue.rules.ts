import type { IssueType } from "@/generated/prisma/enums";
import { CHILD_TYPE_FOR, ISSUE_TYPE_LABELS, REQUIRED_PARENT_TYPE } from "@/modules/issues/issue.constants";

export interface ParentRef {
  id: string;
  type: IssueType;
  projectId: string;
  archivedAt: Date | null;
}

export function childTypeFor(type: IssueType): IssueType | null {
  return CHILD_TYPE_FOR[type];
}

export function requiredParentType(type: IssueType): IssueType | null {
  return REQUIRED_PARENT_TYPE[type];
}

/**
 * Returns a human-readable violation, or null when the parent/child pairing is legal.
 * Cycles of mixed types are structurally impossible when this rule holds; self-parenting
 * and ancestor walks are still checked at the service layer.
 */
export function parentViolation(childType: IssueType, parent: ParentRef | null, childProjectId: string): string | null {
  const required = REQUIRED_PARENT_TYPE[childType];

  if (required === null) {
    if (parent) return `${ISSUE_TYPE_LABELS[childType]}s belong directly under a project, not under another issue.`;
    return null;
  }

  if (!parent) return `${ISSUE_TYPE_LABELS[childType]}s must sit under a ${ISSUE_TYPE_LABELS[required]}.`;
  if (parent.projectId !== childProjectId) return "The parent must belong to the same project.";
  if (parent.type !== required) {
    return `${ISSUE_TYPE_LABELS[childType]}s must sit under a ${ISSUE_TYPE_LABELS[required]}, not a ${ISSUE_TYPE_LABELS[parent.type]}.`;
  }
  return null;
}

export function typeChangeViolation(
  newType: IssueType,
  parent: ParentRef | null,
  childProjectId: string,
  children: { type: IssueType }[],
): string | null {
  const parentError = parentViolation(newType, parent, childProjectId);
  if (parentError) return parentError;

  const allowedChild = CHILD_TYPE_FOR[newType];
  for (const child of children) {
    if (allowedChild === null) return "A Sub-task cannot have children, so this type change is not allowed.";
    if (child.type !== allowedChild) {
      return `Cannot change type to ${ISSUE_TYPE_LABELS[newType]} while ${ISSUE_TYPE_LABELS[child.type]} children exist.`;
    }
  }
  return null;
}

/** Walks ancestor ids (nearest parent first). `getParentId` should return null at the root. */
export function wouldCreateCycle(
  issueId: string,
  newParentId: string | null,
  getParentId: (id: string) => string | null | undefined,
): boolean {
  if (!newParentId) return false;
  if (newParentId === issueId) return true;
  const seen = new Set<string>([issueId]);
  let current: string | null | undefined = newParentId;
  let steps = 0;
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = getParentId(current);
    steps += 1;
    if (steps > 8) return true;
  }
  return false;
}

export function storyFieldViolation(asA: string, iWant: string, soThat: string): string | null {
  if (!asA.trim() || !iWant.trim() || !soThat.trim()) {
    return "User Stories require As a, I want and So that. The system does not fill these in.";
  }
  return null;
}
