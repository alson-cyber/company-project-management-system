import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IssueTree } from "@/components/issues/issue-tree";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { listAssignableMembers, listProjectIssueTree } from "@/modules/issues/issue.queries";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { hasProjectPermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}): Promise<Metadata> {
  const { projectKey } = await params;
  return { title: `${projectKey.toUpperCase()} issues` };
}

export default async function ProjectIssuesPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();

  const [{ tree, progress }, members] = await Promise.all([
    listProjectIssueTree(ctx, project.id),
    listAssignableMembers(ctx, project.id),
  ]);
  const canMutate = hasProjectPermission(ctx, "project.participate", project.id);

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="issues" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader
            title="Issues"
            description={`Progress ${progress.percent}% from executable work (Tasks without Sub-tasks, and Sub-tasks).`}
          />
          <CardBody>
            <IssueTree
              projectId={project.id}
              projectKey={project.key}
              tree={tree}
              canMutate={canMutate}
              members={members}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Inspector" />
          <CardBody>
            <p className="text-sm text-muted">Open an issue from the hierarchy to edit it. Sub-tasks cannot have children.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
