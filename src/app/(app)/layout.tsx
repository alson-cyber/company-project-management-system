import { AppShell } from "@/components/shell/app-shell";
import { buildNavigation } from "@/components/shell/navigation";
import { countUnread, listRecentInbox, refreshDateAttention } from "@/modules/attention/attention.queries";
import { listMyProjects } from "@/modules/projects/project.queries";
import { describeAccess } from "@/server/access/describe";
import { hasWorkspacePermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAuthContext();
  await refreshDateAttention(ctx);
  const [projects, unreadCount, recent] = await Promise.all([
    listMyProjects(ctx),
    countUnread(ctx),
    listRecentInbox(ctx, 6),
  ]);

  const navigation = buildNavigation({
    canViewExecutive: hasWorkspacePermission(ctx, "executive.view"),
    canAdminister: hasWorkspacePermission(ctx, "admin.access"),
    projects: projects.map(({ key, name, color }) => ({ key, name, color })),
    unreadCount,
  });

  return (
    <AppShell
      navigation={navigation}
      workspaceName={ctx.workspace.name}
      user={{ name: ctx.user.name, email: ctx.user.email, roles: describeAccess(ctx) }}
      unreadCount={unreadCount}
      recentInbox={recent.map((item) => ({
        id: item.id,
        sentence: item.sentence,
        unread: item.readAt === null,
        href: `/inbox/open/${item.id}`,
      }))}
    >
      {children}
    </AppShell>
  );
}
