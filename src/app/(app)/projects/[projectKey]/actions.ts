"use server";

import { setProjectHealth, updateProject } from "@/modules/projects/project.service";
import { getActionAuthContext } from "@/server/access/session";
import { actionSuccess, toActionError, type ActionResult } from "@/server/errors";
import { revalidateProjectWorkspace } from "@/server/revalidate-project";

export type SetHealthState = ActionResult<{ changed: boolean }> | null;
export type UpdateProjectState = ActionResult<{ changed: boolean }> | null;

function revalidate(formData: FormData) {
  const projectKey = formData.get("projectKey");
  if (typeof projectKey === "string" && projectKey) revalidateProjectWorkspace(projectKey);
}

export async function setProjectHealthAction(_previous: SetHealthState, formData: FormData): Promise<SetHealthState> {
  try {
    const ctx = await getActionAuthContext();
    const result = await setProjectHealth(ctx, {
      projectId: formData.get("projectId"),
      health: formData.get("health"),
      note: formData.get("note") ?? undefined,
    });
    revalidate(formData);
    return actionSuccess({ changed: result.changed });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateProjectAction(_previous: UpdateProjectState, formData: FormData): Promise<UpdateProjectState> {
  try {
    const ctx = await getActionAuthContext();
    const result = await updateProject(ctx, {
      projectId: formData.get("projectId"),
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      status: formData.get("status"),
      targetDate: formData.get("targetDate") ?? "",
    });
    revalidate(formData);
    return actionSuccess({ changed: result.changed });
  } catch (error) {
    return toActionError(error);
  }
}
