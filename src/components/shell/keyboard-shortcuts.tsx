"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";

/** Events other components listen for, so shortcuts and the command palette share one path. */
export const OPEN_PALETTE_EVENT = "workhub:open-palette";
export const OPEN_SHORTCUTS_EVENT = "workhub:open-shortcuts";
export const CREATE_EPIC_EVENT = "workhub:create-epic";

const GO_TO: Record<string, { href: string; label: string }> = {
  d: { href: "/", label: "Dashboard" },
  p: { href: "/projects", label: "Projects" },
  m: { href: "/my-work", label: "My Work" },
  i: { href: "/inbox", label: "Inbox" },
  t: { href: "/team", label: "Team" },
  r: { href: "/reports", label: "Reports" },
};

export const SHORTCUT_GROUPS: Array<{ title: string; items: Array<{ keys: string[]; label: string }> }> = [
  {
    title: "Anywhere",
    items: [
      { keys: ["⌘", "K"], label: "Open the command palette" },
      { keys: ["/"], label: "Search" },
      { keys: ["?"], label: "Show these shortcuts" },
      { keys: ["Esc"], label: "Close a dialog or the open issue" },
    ],
  },
  {
    title: "Go to",
    items: Object.entries(GO_TO).map(([key, target]) => ({ keys: ["G", key.toUpperCase()], label: target.label })),
  },
  {
    title: "In a project",
    items: [
      { keys: ["C"], label: "Create an epic" },
      { keys: ["1"], label: "Overview" },
      { keys: ["2"], label: "Issues" },
      { keys: ["3"], label: "Board" },
      { keys: ["4"], label: "Timeline" },
    ],
  },
  {
    title: "In the issue list",
    items: [
      { keys: ["↑", "↓"], label: "Move between issues" },
      { keys: ["←", "→"], label: "Collapse or expand" },
    ],
  },
];

const PROJECT_TABS = ["", "/issues", "/board", "/timeline"];

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** Global single-key shortcuts. They never fire while you are typing in a field. */
export function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const openHelp = () => setHelpOpen(true);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, openHelp);
    return () => window.removeEventListener(OPEN_SHORTCUTS_EVENT, openHelp);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || document.querySelector("[role=dialog]")) return;
      const key = event.key.toLowerCase();
      const projectKey = pathname.match(/^\/projects\/([^/]+)/)?.[1];

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const target = GO_TO[key];
        if (target) {
          event.preventDefault();
          router.push(target.href);
        }
        return;
      }

      if (key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
      } else if (event.key === "/") {
        event.preventDefault();
        window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
      } else if (event.key === "?") {
        event.preventDefault();
        setHelpOpen(true);
      } else if (key === "c" && projectKey) {
        event.preventDefault();
        if (pathname.startsWith(`/projects/${projectKey}/issues`)) window.dispatchEvent(new Event(CREATE_EPIC_EVENT));
        else router.push(`/projects/${projectKey}/issues?new=epic`);
      } else if (projectKey && ["1", "2", "3", "4"].includes(key)) {
        event.preventDefault();
        router.push(`/projects/${projectKey}${PROJECT_TABS[Number(key) - 1]}`);
      } else if (event.key === "Escape" && projectKey) {
        const issueOpen = pathname.match(/^\/projects\/[^/]+\/issues\/\d+/);
        if (issueOpen) router.push(`/projects/${projectKey}/issues`, { scroll: false });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  return <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />;
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-grid min-w-6 place-items-center rounded-md border border-line-strong bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink shadow-[0_1px_0_var(--color-line-strong)]">
      {children}
    </kbd>
  );
}

function ShortcutHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25 animate-[enter_160ms_ease-out_both]" />
        <Dialog.Content className="fixed left-1/2 top-[10vh] z-50 max-h-[80vh] w-[min(620px,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-pop focus:outline-none">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-[-0.02em]">Keyboard shortcuts</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-[13px] text-muted">
                Work faster without the mouse. Shortcuts pause while you type in a field.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md px-2 py-1 text-[13px] font-medium text-muted hover:bg-surface-3 hover:text-ink">
              Close
            </Dialog.Close>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {SHORTCUT_GROUPS.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{group.title}</h3>
                <ul className="grid gap-1.5">
                  {group.items.map((item) => (
                    <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                      <span>{item.label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {item.keys.map((key, index) => (
                          <Key key={`${key}-${index}`}>{key}</Key>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
