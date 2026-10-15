import type { IconName } from "@/components/shell/icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Shown as a quiet "Soon" tag: the page exists but its feature is not built yet. */
  upcoming?: boolean;
}

export interface NavProject {
  key: string;
  name: string;
  color: string;
}

export interface ShellNavigation {
  primary: NavItem[];
  management: NavItem[];
  projects: NavProject[];
}

/** Navigation is computed on the server from the caller's permissions. */
export function buildNavigation(options: {
  canViewExecutive: boolean;
  canAdminister: boolean;
  projects: NavProject[];
}): ShellNavigation {
  const primary: NavItem[] = [
    { href: "/", label: "Dashboard", icon: "dashboard" },
    { href: "/projects", label: "Projects", icon: "projects" },
    { href: "/my-work", label: "My Work", icon: "work", upcoming: true },
    { href: "/inbox", label: "Inbox", icon: "inbox", upcoming: true },
    { href: "/team", label: "Team", icon: "team" },
    { href: "/reports", label: "Reports", icon: "reports", upcoming: true },
  ];
  const management: NavItem[] = [];
  if (options.canViewExecutive) management.push({ href: "/executive", label: "Executive", icon: "crown" });
  if (options.canAdminister) management.push({ href: "/admin", label: "Administration", icon: "shield" });
  return { primary, management, projects: options.projects };
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
