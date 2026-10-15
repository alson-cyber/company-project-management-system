"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "@/components/shell/icons";

interface SearchHit {
  id: string;
  href: string;
  label: string;
  meta: string;
}

interface SearchPayload {
  query: string;
  projects: { id: string; key: string; name: string; href: string }[];
  issues: { id: string; key: string; title: string; projectName: string; href: string }[];
  people: { id: string; name: string; jobTitle: string | null; email: string | null; href: string }[];
}

const empty: SearchPayload = { query: "", projects: [], issues: [], people: [] };

export function SearchDialog() {
  const router = useRouter();
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const groups = useMemo(() => {
    const next: { label: string; hits: SearchHit[] }[] = [];
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
  }, [visible]);

  const sections = useMemo(() => {
    let index = 0;
    return groups.map((group) => ({
      label: group.label,
      hits: group.hits.map((hit) => ({ ...hit, index: index++ })),
    }));
  }, [groups]);
  const flat = sections.flatMap((group) => group.hits);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
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
      go(flat[active].href);
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
        <Dialog.Overlay className="fixed inset-0 z-50 bg-nav/40" />
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
              placeholder="Projects, issues, people"
              aria-label="Search"
              aria-controls={listId}
              aria-activedescendant={flat[active] ? `${listId}-${flat[active].id}` : undefined}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-2"
              autoFocus
            />
          </div>
          <div id={listId} role="listbox" aria-label="Search results" className="max-h-[50vh] overflow-y-auto p-2">
            {status === "error" ? <p className="px-2 py-6 text-sm text-muted">Search is unavailable right now.</p> : null}
            {status !== "error" && trimmed.length < 2 ? (
              <p className="px-2 py-6 text-sm text-muted">Type at least two characters.</p>
            ) : null}
            {pending ? <p className="px-2 py-6 text-sm text-muted">Searching…</p> : null}
            {ready && flat.length === 0 ? (
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
                          onClick={() => go(hit.href)}
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
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
