import { notFound } from "next/navigation";
import { HierarchyWorkspace } from "@/components/issues/hierarchy-workspace";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { listAssignableMembers, listProjectIssueTree } from "@/modules/issues/issue.queries";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { hasProjectPermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";

export default async function ProjectIssuesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectKey: string }>;
}) {
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
      <HierarchyWorkspace
        projectId={project.id}
        projectKey={project.key}
        tree={tree}
        progressPercent={progress.percent}
        members={members}
        canMutate={canMutate}
      >
        {children}
      </HierarchyWorkspace>
    </>
  );
}
