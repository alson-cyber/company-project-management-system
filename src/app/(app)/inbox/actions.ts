"use server";

import { revalidatePath } from "next/cache";
import { markAllNotificationsRead, markNotificationRead } from "@/modules/attention/attention.queries";
import { getActionAuthContext } from "@/server/access/session";

export interface InboxActionState {
  error?: string;
}

function refresh() {
  revalidatePath("/inbox");
  revalidatePath("/");
  revalidatePath("/my-work");
}

export async function markReadAction(_previous: InboxActionState, formData: FormData): Promise<InboxActionState> {
  const ctx = await getActionAuthContext();
  const id = String(formData.get("notificationId") ?? "");
  try {
    await markNotificationRead(ctx, id);
  } catch {
    return { error: "That notification could not be marked read." };
  }
  refresh();
  return {};
}

export async function markAllReadAction(_previous: InboxActionState, formData: FormData): Promise<InboxActionState> {
  formData.get("mark");
  const ctx = await getActionAuthContext();
  try {
    await markAllNotificationsRead(ctx);
  } catch {
    return { error: "Inbox could not be marked read." };
  }
  refresh();
  return {};
}
