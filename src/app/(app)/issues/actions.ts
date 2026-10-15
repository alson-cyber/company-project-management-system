"use server";

import { revalidatePath } from "next/cache";
import {
  addAcceptanceCriterion,
  archiveIssue,
  createIssue,
  removeAcceptanceCriterion,
  restoreIssue,
  setIssueLabels,
  setStoryFields,
  updateAcceptanceCriterion,
  updateIssue,
} from "@/modules/issues/issue.service";
import { getActionAuthContext } from "@/server/access/session";
import { actionSuccess, toActionError, type ActionResult } from "@/server/errors";

export type IssueActionState = ActionResult<{ key?: string; id?: string; changed?: boolean }> | null;

function pathsFor(projectKey: string, issueNumber?: string | number) {
  revalidatePath(`/projects/${projectKey}`);
  revalidatePath(`/projects/${projectKey}/issues`);
  if (issueNumber !== undefined) revalidatePath(`/projects/${projectKey}/issues/${issueNumber}`);
}

function optional(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  return value;
}

export async function createIssueAction(_previous: IssueActionState, formData: FormData): Promise<IssueActionState> {
  try {
    const ctx = await getActionAuthContext();
    const type = optional(formData.get("type"));
    const story =
      type === "USER_STORY"
        ? {
            asA: optional(formData.get("asA")) ?? "",
            iWant: optional(formData.get("iWant")) ?? "",
            soThat: optional(formData.get("soThat")) ?? "",
          }
        : undefined;
    const criteriaRaw = optional(formData.get("acceptanceCriteria"));
    const labelsRaw = optional(formData.get("labels"));
    const created = await createIssue(ctx, {
      projectId: formData.get("projectId"),
      type,
      parentId: optional(formData.get("parentId")),
      title: formData.get("title"),
      description: optional(formData.get("description")),
      priority: optional(formData.get("priority")),
      assigneeId: optional(formData.get("assigneeId")),
      dueDate: optional(formData.get("dueDate")),
      story,
      acceptanceCriteria: criteriaRaw
        ? criteriaRaw
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
        : undefined,
      labels: labelsRaw
        ? labelsRaw
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
        : undefined,
    });
    pathsFor(created.projectKey, created.number);
    return actionSuccess({ key: created.key, id: created.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateIssueAction(_previous: IssueActionState, formData: FormData): Promise<IssueActionState> {
  try {
    const ctx = await getActionAuthContext();
    const projectKey = optional(formData.get("projectKey")) ?? "";
    const number = optional(formData.get("issueNumber"));
    const result = await updateIssue(ctx, {
      issueId: formData.get("issueId"),
      title: formData.get("title"),
      description: optional(formData.get("description")),
      status: formData.get("status"),
      priority: formData.get("priority"),
      assigneeId: optional(formData.get("assigneeId")) ?? null,
      dueDate: optional(formData.get("dueDate")) ?? null,
    });
    pathsFor(projectKey, number);
    return actionSuccess({ changed: result.changed, key: result.key });
  } catch (error) {
    return toActionError(error);
  }
}

export async function setStoryFieldsAction(_previous: IssueActionState, formData: FormData): Promise<IssueActionState> {
  try {
    const ctx = await getActionAuthContext();
    const result = await setStoryFields(ctx, {
      issueId: formData.get("issueId"),
      asA: formData.get("asA"),
      iWant: formData.get("iWant"),
      soThat: formData.get("soThat"),
    });
    pathsFor(optional(formData.get("projectKey")) ?? "", optional(formData.get("issueNumber")));
    return actionSuccess({ changed: result.changed });
  } catch (error) {
    return toActionError(error);
  }
}

export async function addCriterionAction(_previous: IssueActionState, formData: FormData): Promise<IssueActionState> {
  try {
    const ctx = await getActionAuthContext();
    const created = await addAcceptanceCriterion(ctx, {
      issueId: formData.get("issueId"),
      text: formData.get("text"),
    });
    pathsFor(optional(formData.get("projectKey")) ?? "", optional(formData.get("issueNumber")));
    return actionSuccess({ id: created.id });
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCriterionAction(_previous: IssueActionState, formData: FormData): Promise<IssueActionState> {
  try {
    const ctx = await getActionAuthContext();
    const isMetRaw = optional(formData.get("isMet"));
    const result = await updateAcceptanceCriterion(ctx, {
      criterionId: formData.get("criterionId"),
      text: optional(formData.get("text")),
      isMet: isMetRaw === undefined ? undefined : isMetRaw === "true",
    });
    pathsFor(optional(formData.get("projectKey")) ?? "", optional(formData.get("issueNumber")));
    return actionSuccess({ changed: result.changed });
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeCriterionAction(_previous: IssueActionState, formData: FormData): Promise<IssueActionState> {
  try {
    const ctx = await getActionAuthContext();
    await removeAcceptanceCriterion(ctx, { criterionId: formData.get("criterionId") });
    pathsFor(optional(formData.get("projectKey")) ?? "", optional(formData.get("issueNumber")));
    return actionSuccess({});
  } catch (error) {
    return toActionError(error);
  }
}

export async function setLabelsAction(_previous: IssueActionState, formData: FormData): Promise<IssueActionState> {
  try {
    const ctx = await getActionAuthContext();
    const labelsRaw = optional(formData.get("labels")) ?? "";
    const result = await setIssueLabels(ctx, {
      issueId: formData.get("issueId"),
      labels: labelsRaw
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    });
    pathsFor(optional(formData.get("projectKey")) ?? "", optional(formData.get("issueNumber")));
    return actionSuccess({ changed: true, key: result.labels.join(", ") });
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveIssueAction(_previous: IssueActionState, formData: FormData): Promise<IssueActionState> {
  try {
    const ctx = await getActionAuthContext();
    const includeDescendants = optional(formData.get("includeDescendants")) === "on";
    await archiveIssue(ctx, { issueId: formData.get("issueId"), includeDescendants });
    const projectKey = optional(formData.get("projectKey")) ?? "";
    revalidatePath(`/projects/${projectKey}`);
    revalidatePath(`/projects/${projectKey}/issues`);
    return actionSuccess({});
  } catch (error) {
    return toActionError(error);
  }
}

export async function restoreIssueAction(_previous: IssueActionState, formData: FormData): Promise<IssueActionState> {
  try {
    const ctx = await getActionAuthContext();
    await restoreIssue(ctx, { issueId: formData.get("issueId") });
    pathsFor(optional(formData.get("projectKey")) ?? "", optional(formData.get("issueNumber")));
    return actionSuccess({});
  } catch (error) {
    return toActionError(error);
  }
}
