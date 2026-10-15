import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IssueInspector } from "@/components/issues/issue-inspector";
import { IssueTree } from "@/components/issues/issue-tree";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { listIssueActivity } from "@/modules/activity/activity.queries";
import { getVisibleIssueByNumber, listAssignableMembers, listProjectIssueTree } from "@/modules/issues/issue.queries";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { hasProjectPermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectKey: string; issueNumber: string }>;
}): Promise<Metadata> {
  const { projectKey, issueNumber } = await params;
  return { title: `${projectKey.toUpperCase()}-${issueNumber}` };
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ projectKey: string; issueNumber: string }>;
}) {
  const { projectKey, issueNumber } = await params;
  const number = Number(issueNumber);
  if (!Number.isInteger(number) || number < 1) notFound();

  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();

  const issue = await getVisibleIssueByNumber(ctx, project.key, number);
  if (!issue) notFound();

  const [{ tree, progress }, members, activity] = await Promise.all([
    listProjectIssueTree(ctx, project.id),
    listAssignableMembers(ctx, project.id),
    listIssueActivity(ctx, issue.id, 40),
  ]);
  const canMutate = hasProjectPermission(ctx, "project.participate", project.id);

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="issues" />
      <p className="sr-only">
        Project progress {progress.percent} percent
      </p>
      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader title="Issues" />
          <CardBody>
            <IssueTree
              projectId={project.id}
              projectKey={project.key}
              tree={tree}
              selectedKey={issue.key}
              canMutate={canMutate}
              members={members}
            />
          </CardBody>
        </Card>
        <IssueInspector issue={issue} members={members} activity={activity} />
      </div>
    </>
  );
}
