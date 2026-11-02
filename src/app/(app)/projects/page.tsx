import type { Metadata } from "next";
import { ProjectCards } from "@/components/projects/project-cards";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listVisibleProjects } from "@/modules/projects/project.queries";
import { hasWorkspacePermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const ctx = await requireAuthContext();
  const projects = await listVisibleProjects(ctx);
  const companyWide = hasWorkspacePermission(ctx, "executive.view");

  return (
    <>
      <PageHeader
        title="Projects"
        description={
          companyWide
            ? "Every active project in the workspace. Executive access is read-only unless you are a member."
            : "Projects you are a member of."
        }
      />
      {projects.length === 0 ? (
        <Card>
          <EmptyState title="No projects to show" illustration="box">
            {hasWorkspacePermission(ctx, "admin.access")
              ? "Administrators manage projects from Administration; project content is visible to members."
              : "A project lead or administrator can add you to a project."}
          </EmptyState>
        </Card>
      ) : (
        <ProjectCards projects={projects} />
      )}
    </>
  );
}
