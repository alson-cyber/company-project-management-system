import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand";
import { MobileNav } from "@/components/shell/mobile-nav";
import type { ShellNavigation } from "@/components/shell/navigation";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserMenu } from "@/components/shell/user-menu";

export function AppShell({
  navigation,
  workspaceName,
  user,
  children,
}: {
  navigation: ShellNavigation;
  workspaceName: string;
  user: { name: string; email: string; roles: string[] };
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:pl-[240px]">
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-surface px-3 py-2 text-sm font-semibold shadow-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] flex-col overflow-y-auto bg-nav px-3 py-4 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <BrandMark inverted />
          <div className="min-w-0">
            <p className="text-[15px] font-bold tracking-[-0.02em] text-white">Workhub</p>
            <p className="truncate text-xs text-nav-muted">{workspaceName}</p>
          </div>
        </div>
        <SidebarNav navigation={navigation} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur-md sm:px-6">
        <MobileNav navigation={navigation} workspaceName={workspaceName} />
        <p className="truncate text-[13px] text-muted lg:hidden">Workhub</p>
        <div className="ml-auto">
          <UserMenu name={user.name} email={user.email} roles={user.roles} />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
