import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listIssueActivity } from "@/modules/activity/activity.queries";
import { listIssueCollaboration } from "@/modules/collaboration/collaboration.queries";
import { IssueInspector } from "@/components/issues/issue-inspector";
import { parseInspectorSection } from "@/components/issues/inspector-section";
import { findIssueNode } from "@/modules/issues/issue-tree.filter";
import { getVisibleIssueByNumber, listAssignableMembers, listProjectIssueTree } from "@/modules/issues/issue.queries";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { hasProjectPermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";
import { visibleProject } from "../../guard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectKey: string; issueNumber?: string[] }>;
}): Promise<Metadata> {
  const { projectKey, issueNumber } = await params;
  const { project } = await visibleProject(projectKey);
  const number = issueNumber?.[0];
  return { title: number ? `${project.key}-${number}` : `${project.key} issues` };
}

export default async function ProjectIssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectKey: string; issueNumber?: string[] }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { projectKey, issueNumber } = await params;
  const { section } = await searchParams;
  const segments = issueNumber ?? [];
  if (segments.length > 1) notFound();
  if (segments.length === 0) {
    return (
      <div className="px-6 py-10">
        <h2 className="text-sm font-semibold">No issue selected</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Choose a row to inspect it. The hierarchy stays in place while an issue is open.
        </p>
      </div>
    );
  }

  const number = Number(segments[0]);
  if (!Number.isInteger(number) || number < 1) notFound();

  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();

  const issue = await getVisibleIssueByNumber(ctx, project.key, number);
  if (!issue) notFound();

  const [{ tree }, members, activity, collaboration] = await Promise.all([
    listProjectIssueTree(ctx, project.id),
    listAssignableMembers(ctx, project.id),
    listIssueActivity(ctx, issue.id, 80),
    listIssueCollaboration(ctx, issue.id),
  ]);

  return (
    <IssueInspector
      key={issue.id}
      issue={issue}
      members={members}
      activity={activity}
      childIssues={findIssueNode(tree, issue.id)?.children ?? []}
      notes={collaboration.notes}
      comments={collaboration.comments}
      attachments={collaboration.attachments}
      viewer={{
        id: ctx.userId,
        canModerate: hasProjectPermission(ctx, "project.manage", project.id),
      }}
      initialSection={parseInspectorSection(section)}
    />
  );
}
