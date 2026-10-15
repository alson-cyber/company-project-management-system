import { revalidatePath } from "next/cache";

/** Refreshes every project workspace tab that reads the same project records. */
export function revalidateProjectWorkspace(projectKey: string, issueNumber?: string | number): void {
  revalidatePath(`/projects/${projectKey}`);
  revalidatePath(`/projects/${projectKey}/issues`);
  revalidatePath(`/projects/${projectKey}/board`);
  revalidatePath(`/projects/${projectKey}/timeline`);
  revalidatePath(`/projects/${projectKey}/files`);
  revalidatePath(`/projects/${projectKey}/team`);
  revalidatePath(`/projects/${projectKey}/activity`);
  if (issueNumber !== undefined) revalidatePath(`/projects/${projectKey}/issues/${issueNumber}`);
}
