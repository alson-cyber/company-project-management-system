"use server";

import { revalidatePath } from "next/cache";
import { createProject } from "@/modules/projects/project.service";
import { getActionAuthContext } from "@/server/access/session";
import { actionSuccess, toActionError, type ActionResult } from "@/server/errors";

export type CreateProjectState = ActionResult<{ key: string }> | null;

export async function createProjectAction(_previous: CreateProjectState, formData: FormData): Promise<CreateProjectState> {
  try {
    const ctx = await getActionAuthContext();
    const result = await createProject(ctx, {
      key: formData.get("key"),
      name: formData.get("name"),
      description: formData.get("description") ?? undefined,
      status: formData.get("status") || undefined,
      targetDate: formData.get("targetDate") ?? undefined,
      leadUserId: formData.get("leadUserId"),
      color: formData.get("color") || undefined,
    });
    revalidatePath("/");
    revalidatePath("/projects");
    revalidatePath("/admin");
    revalidatePath("/executive");
    return actionSuccess({ key: result.key });
  } catch (error) {
    return toActionError(error);
  }
}
