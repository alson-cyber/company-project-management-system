import { notFound } from "next/navigation";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { requireAuthContext } from "@/server/access/session";

/** Loads a project the caller may see. Missing access uses the not-found page, including its title. */
export async function visibleProject(projectKey: string) {
  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();
  return { ctx, project };
}
