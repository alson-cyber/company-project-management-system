import { AppShell } from "@/components/shell/app-shell";
import { buildNavigation } from "@/components/shell/navigation";
import { listMyProjects } from "@/modules/projects/project.queries";
import { describeAccess } from "@/server/access/describe";
import { hasWorkspacePermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuthContext();
  const projects = await listMyProjects(ctx);

  const navigation = buildNavigation({
    canViewExecutive: hasWorkspacePermission(ctx, "executive.view"),
    canAdminister: hasWorkspacePermission(ctx, "admin.access"),
    projects: projects.map(({ key, name, color }) => ({ key, name, color })),
  });

  return (
    <AppShell
      navigation={navigation}
      workspaceName={ctx.workspace.name}
      user={{ name: ctx.user.name, email: ctx.user.email, roles: describeAccess(ctx) }}
    >
      {children}
    </AppShell>
  );
}
