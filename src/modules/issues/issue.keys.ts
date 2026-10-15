import { PROJECT_KEY_PATTERN } from "@/modules/projects/project.schema";

/** Display key: project key, hyphen, project-local number. Never encodes hierarchy. */
export function issueKey(projectKey: string, number: number): string {
  return `${projectKey}-${number}`;
}

const ISSUE_KEY_PATTERN = /^([A-Z][A-Z0-9]{1,9})-([1-9][0-9]*)$/;

export function parseIssueKey(value: string): { projectKey: string; number: number } | null {
  const match = value.trim().toUpperCase().match(ISSUE_KEY_PATTERN);
  if (!match) return null;
  const projectKey = match[1];
  const number = match[2] ? Number(match[2]) : NaN;
  if (!projectKey || !PROJECT_KEY_PATTERN.test(projectKey) || !Number.isInteger(number)) return null;
  return { projectKey, number };
}
