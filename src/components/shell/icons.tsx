import type { ReactNode } from "react";

/** Icon paths carried over from the prototype (prototype/app.js `icon()`). */
const paths = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  projects: (
    <>
      <path d="M4 5.5h6l2 2h8v11H4z" />
      <path d="M4 8h16" />
    </>
  ),
  work: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 5h16v13H4z" />
      <path d="M4 13h4l2 3h4l2-3h4" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M4 20c0-3 2-5 5-5s5 2 5 5M14 15c3 0 5 1.8 5 4.5" />
    </>
  ),
  reports: (
    <>
      <path d="M5 20V10M12 20V4M19 20v-7" />
      <path d="M3 20h18" />
    </>
  ),
  crown: (
    <>
      <path d="M4 7l4 4 4-7 4 7 4-4-2 11H6z" />
      <path d="M7 21h10" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 16l-4-4 4-4M6 12h10" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
