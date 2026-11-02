"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/shell/icons";
import { isActivePath, type NavItem, type ShellNavigation } from "@/components/shell/navigation";

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const active = isActivePath(usePathname(), item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
        active
          ? "bg-nav-active font-medium text-ink"
          : "text-nav-text hover:bg-nav-2 hover:text-ink",
      )}
    >
      <Icon name={item.icon} className="size-[17px] opacity-90" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="min-w-5 rounded-full bg-danger px-1.5 text-center text-[11px] font-semibold tabular-nums text-surface">
          {item.badge > 99 ? "99+" : item.badge}
          <span className="sr-only"> unread</span>
        </span>
      ) : null}
    </Link>
  );
}

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-nav-muted">
      {children}
    </p>
  );
}

export function SidebarNav({ navigation, onNavigate }: { navigation: ShellNavigation; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="grid gap-5">
      <ul className="grid gap-0.5">
        {navigation.primary.map((item) => (
          <li key={item.href}>
            <NavLink item={item} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>

      {navigation.management.length > 0 ? (
        <div>
          <GroupLabel>Management</GroupLabel>
          <ul className="grid gap-0.5">
            {navigation.management.map((item) => (
              <li key={item.href}>
                <NavLink item={item} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <GroupLabel>Your projects</GroupLabel>
        {navigation.projects.length === 0 ? (
          <p className="px-2.5 py-1 text-[13px] text-nav-muted">You are not a member of any project yet.</p>
        ) : (
          <ul className="grid gap-0.5">
            {navigation.projects.map((project) => {
              const href = `/projects/${project.key}`;
              const active = isActivePath(pathname, href);
              return (
                <li key={project.key}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                      active ? "bg-nav-active font-medium text-ink" : "text-nav-text hover:bg-nav-2 hover:text-ink",
                    )}
                  >
                    <span
                      className="grid size-[18px] shrink-0 place-items-center rounded-[5px] text-[10px] font-bold text-white"
                      style={{ backgroundColor: project.color }}
                      aria-hidden="true"
                    >
                      {project.key[0]}
                    </span>
                    <span className="truncate">{project.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
