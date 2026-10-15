import type { Metadata } from "next";
import { CreateProjectForm } from "@/app/(app)/admin/create-project-form";
import { Badge, ProjectStatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listLeadCandidates, listUsersForAdmin } from "@/modules/people/people.queries";
import { listProjectsForAdmin } from "@/modules/projects/project.queries";
import { requireWorkspacePermission } from "@/server/access/session";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const ctx = await requireWorkspacePermission("admin.access");
  const [users, projects, leads] = await Promise.all([
    listUsersForAdmin(ctx),
    listProjectsForAdmin(ctx),
    listLeadCandidates(ctx),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-2.5 text-xs font-semibold text-muted">
            Administration · configuration
          </span>
        }
        title="Workspace administration"
        description="Users, roles and project records. Administration is not Executive access: this page does not grant project content or contribution reports."
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader
            title="People"
            description="Inviting, deactivating and granting roles will be added in a later stage. Every grant must be explicit."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    Person
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Roles
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Projects
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-[13px] text-muted">{user.jobTitle ?? "—"}</p>
                    </td>
                    <td className="px-3 py-3 text-[13px]">{user.email}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.workspaceRoles.length === 0 ? <Badge>Member</Badge> : null}
                        {user.workspaceRoles.map((role) => (
                          <Badge key={role} tone={role === "ADMIN" ? "purple" : "blue"}>
                            {role === "ADMIN" ? "Admin" : "Executive"}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">{user.projectCount}</td>
                    <td className="px-5 py-3">
                      <Badge tone={user.status === "ACTIVE" ? "green" : "gray"}>
                        {user.status === "ACTIVE" ? "Active" : "Deactivated"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Projects" description="Metadata only. Open a project you belong to in order to see its content." />
          {projects.length === 0 ? (
            <EmptyState title="No projects yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Key
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      Lead
                    </th>
                    <th scope="col" className="px-5 py-2.5 font-semibold">
                      Members
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-3 font-mono text-[13px]">{project.key}</td>
                      <td className="px-3 py-3">{project.name}</td>
                      <td className="px-3 py-3">
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td className="px-3 py-3">{project.lead?.name ?? "—"}</td>
                      <td className="px-5 py-3 tabular-nums">{project.memberCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Create a project" description="The chosen lead becomes the first member. You are not added unless you are the lead." />
          <CardBody>
            <CreateProjectForm leads={leads} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
