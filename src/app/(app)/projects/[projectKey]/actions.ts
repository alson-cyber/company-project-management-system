"use server";

import { revalidatePath } from "next/cache";
import { setProjectHealth } from "@/modules/projects/project.service";
import { getActionAuthContext } from "@/server/access/session";
import { actionSuccess, toActionError, type ActionResult } from "@/server/errors";

export type SetHealthState = ActionResult<{ changed: boolean }> | null;

export async function setProjectHealthAction(_previous: SetHealthState, formData: FormData): Promise<SetHealthState> {
  try {
    const ctx = await getActionAuthContext();
    const result = await setProjectHealth(ctx, {
      projectId: formData.get("projectId"),
      health: formData.get("health"),
      note: formData.get("note") ?? undefined,
    });
    const projectKey = formData.get("projectKey");
    if (typeof projectKey === "string") revalidatePath(`/projects/${projectKey}`);
    return actionSuccess({ changed: result.changed });
  } catch (error) {
    return toActionError(error);
  }
}
