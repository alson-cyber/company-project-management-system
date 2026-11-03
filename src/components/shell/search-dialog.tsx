"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/shell/icons";
import {
  CREATE_EPIC_EVENT,
  OPEN_PALETTE_EVENT,
  OPEN_SHORTCUTS_EVENT,
} from "@/components/shell/keyboard-shortcuts";
import type { ShellNavigation } from "@/components/shell/navigation";
import { isDarkNow, setTheme } from "@/components/shell/theme";

interface SearchHit {
  id: string;
  /** Either a page to open or an action to run. */
  href?: string;
  run?: () => void;
  label: string;
  meta: string;
}

interface Command extends SearchHit {
  keywords: string;
}

interface SearchPayload {
  query: string;
  projects: { id: string; key: string; name: string; href: string }[];
  issues: { id: string; key: string; title: string; projectName: string; href: string }[];
  people: { id: string; name: string; jobTitle: string | null; email: string | null; href: string }[];
}

const empty: SearchPayload = { query: "", projects: [], issues: [], people: [] };

export function SearchDialog({ navigation }: { navigation?: ShellNavigation }) {
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPayload>(empty);
  const [settledQuery, setSettledQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "error">("idle");
  const [active, setActive] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    const openPalette = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, openPalette);
    };
  }, []);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];
    const projectKey = pathname.match(/^\/projects\/([^/]+)/)?.[1];
    if (projectKey) {
      const onIssues = pathname.startsWith(`/projects/${projectKey}/issues`);
      list.push({
        id: "cmd-create-epic",
        label: `Create an epic in ${projectKey}`,
        meta: "C",
        keywords: "new create add epic issue",
        ...(onIssues
          ? { run: () => window.dispatchEvent(new Event(CREATE_EPIC_EVENT)) }
          : { href: `/projects/${projectKey}/issues?new=epic` }),
      });
      for (const [tab, label] of [
        ["", "Overview"],
        ["/issues", "Issues"],
        ["/board", "Board"],
        ["/timeline", "Timeline"],
      ] as const) {
        list.push({
          id: `cmd-tab-${label}`,
          href: `/projects/${projectKey}${tab}`,
          label: `${projectKey} ${label}`,
          meta: "This project",
          keywords: `go open ${label}`,
        });
      }
    }
    for (const item of [...(navigation?.primary ?? []), ...(navigation?.management ?? [])]) {
      list.push({ id: `cmd-nav-${item.href}`, href: item.href, label: `Go to ${item.label}`, meta: "Page", keywords: "go open page" });
    }
    for (const project of navigation?.projects ?? []) {
      list.push({
        id: `cmd-project-${project.key}`,
        href: `/projects/${project.key}`,
        label: project.name,
        meta: `Project · ${project.key}`,
        keywords: "project open",
      });
    }
    list.push({
      id: "cmd-theme",
      run: () => setTheme(isDarkNow() ? "light" : "dark"),
      label: "Switch between light and dark",
      meta: "Appearance",
      keywords: "theme dark mode light mode appearance night",
    });
    list.push({
      id: "cmd-shortcuts",
      run: () => window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT)),
      label: "Show keyboard shortcuts",
      meta: "?",
      keywords: "help keys keyboard shortcuts",
    });
    return list;
  }, [navigation, pathname]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const current = ++request.current;
    const timer = window.setTimeout(() => {
      void fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then(async (response) => {
          if (!response.ok) throw new Error("search failed");
          return (await response.json()) as SearchPayload;
        })
        .then((payload) => {
          if (current !== request.current) return;
          setResults(payload);
          setSettledQuery(trimmed);
          setStatus("idle");
          setActive(0);
        })
        .catch(() => {
          if (current !== request.current) return;
          setStatus("error");
          setSettledQuery(trimmed);
        });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const trimmed = query.trim();
  const ready = status === "idle" && settledQuery === trimmed && trimmed.length >= 2;
  const pending = trimmed.length >= 2 && settledQuery !== trimmed && status !== "error";
  const visible = ready ? results : empty;

  const matchingCommands = useMemo(() => {
    const needle = trimmed.toLowerCase();
    if (!needle) return commands.slice(0, 8);
    return commands.filter((command) => `${command.label} ${command.meta} ${command.keywords}`.toLowerCase().includes(needle)).slice(0, 6);
  }, [commands, trimmed]);

  const groups = useMemo(() => {
    const next: { label: string; hits: SearchHit[] }[] = [];
    if (matchingCommands.length) next.push({ label: trimmed ? "Commands" : "Jump to", hits: matchingCommands });
    if (visible.projects.length) {
      next.push({
        label: "Projects",
        hits: visible.projects.map((project) => ({
          id: project.id,
          href: project.href,
          label: project.name,
          meta: project.key,
        })),
      });
    }
    if (visible.issues.length) {
      next.push({
        label: "Issues",
        hits: visible.issues.map((issue) => ({
          id: issue.id,
          href: issue.href,
          label: issue.title,
          meta: `${issue.key} · ${issue.projectName}`,
        })),
      });
    }
    if (visible.people.length) {
      next.push({
        label: "People",
        hits: visible.people.map((person) => ({
          id: person.id,
          href: person.href,
          label: person.name,
          meta: [person.jobTitle, person.email].filter(Boolean).join(" · "),
        })),
      });
    }
    return next;
  }, [visible, matchingCommands, trimmed]);

  const sections = useMemo(() => {
    let index = 0;
    return groups.map((group) => ({
      label: group.label,
      hits: group.hits.map((hit) => ({ ...hit, index: index++ })),
    }));
  }, [groups]);
  const flat = sections.flatMap((group) => group.hits);

  function go(hit: SearchHit) {
    setOpen(false);
    setQuery("");
    if (hit.run) hit.run();
    else if (hit.href) router.push(hit.href);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (flat.length === 0 ? 0 : (index + 1) % flat.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (flat.length === 0 ? 0 : (index - 1 + flat.length) % flat.length));
    } else if (event.key === "Enter" && flat[active]) {
      event.preventDefault();
      go(flat[active]);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setResults(empty);
          setSettledQuery("");
          setStatus("idle");
        }
      }}
    >
      <Dialog.Trigger className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm text-muted hover:bg-surface-2 sm:max-w-sm sm:flex-none">
        <Icon name="search" className="size-4" />
        <span className="truncate">Search</span>
        <kbd className="ml-auto hidden rounded border border-line px-1.5 text-[10px] font-semibold text-muted-2 sm:inline">⌘K</kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/25" />
        <Dialog.Content
          aria-labelledby={titleId}
          className="fixed left-1/2 top-[12vh] z-50 w-[min(560px,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border border-line bg-surface shadow-pop focus:outline-none"
        >
          <Dialog.Title id={titleId} className="sr-only">
            Search projects, issues and people
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Results are limited to projects and issues you can access.
          </Dialog.Description>
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Icon name="search" className="size-4 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search or jump to…"
              aria-label="Search"
              aria-controls={listId}
              aria-activedescendant={flat[active] ? `${listId}-${flat[active].id}` : undefined}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
              autoFocus
            />
          </div>
          <div id={listId} role="listbox" aria-label="Search results" className="max-h-[50vh] overflow-y-auto p-2">
            {status === "error" ? <p className="px-2 py-6 text-sm text-muted">Search is unavailable right now.</p> : null}
            {status !== "error" && trimmed.length === 1 ? (
              <p className="px-2 py-2 text-xs text-muted">Type one more character to search issues and people.</p>
            ) : null}
            {ready && flat.length === 0 && matchingCommands.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted">No matching projects, issues or people.</p>
            ) : null}
            {sections.map((group) => (
              <section key={group.label} className="mb-2" aria-label={group.label}>
                <h2 className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{group.label}</h2>
                <ul>
                  {group.hits.map((hit) => {
                    const selected = hit.index === active;
                    return (
                      <li key={hit.id}>
                        <button
                          id={`${listId}-${hit.id}`}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`flex w-full items-baseline gap-3 rounded-lg px-2 py-2 text-left text-sm ${selected ? "bg-surface-3" : "hover:bg-surface-2"}`}
                          onMouseEnter={() => setActive(hit.index)}
                          onClick={() => go(hit)}
                        >
                          <span className="min-w-0 flex-1 truncate font-medium">{hit.label}</span>
                          <span className="shrink-0 text-xs text-muted">{hit.meta}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {pending ? <p className="px-2 py-3 text-sm text-muted">Searching issues and people…</p> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
