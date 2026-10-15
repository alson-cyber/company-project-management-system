"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CreateIssueForm } from "@/components/issues/create-issue-form";
import { IssuePriorityBadge, IssueStatusBadge, IssueTypeBadge } from "@/components/ui/issue-badges";
import { cn } from "@/components/ui/cn";
import type { IssueListItem } from "@/modules/issues/issue.queries";

export function IssueTree({
  projectId,
  projectKey,
  tree,
  selectedKey,
  canMutate,
  members,
}: {
  projectId: string;
  projectKey: string;
  tree: IssueListItem[];
  selectedKey?: string;
  canMutate: boolean;
  members: Array<{ id: string; name: string }>;
}) {
  const defaultExpanded = useMemo(() => {
    const ids = new Set<string>();
    const walk = (nodes: IssueListItem[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) ids.add(node.id);
        walk(node.children);
      }
    };
    walk(tree);
    return ids;
  }, [tree]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isOpen = (id: string) => overrides[id] ?? defaultExpanded.has(id);

  const toggle = (id: string) => {
    setOverrides((current) => ({ ...current, [id]: !(current[id] ?? defaultExpanded.has(id)) }));
  };

  return (
    <div className="grid gap-3">
      {canMutate ? <CreateIssueForm projectId={projectId} type="EPIC" members={members} /> : null}
      {tree.length === 0 ? (
        <p className="text-sm text-muted">No issues in this project yet.</p>
      ) : (
        <ul className="grid gap-1" role="tree" aria-label="Issue hierarchy">
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              projectKey={projectKey}
              depth={0}
              isOpen={isOpen}
              toggle={toggle}
              selectedKey={selectedKey}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TreeNode({
  node,
  projectKey,
  depth,
  isOpen,
  toggle,
  selectedKey,
}: {
  node: IssueListItem;
  projectKey: string;
  depth: number;
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  selectedKey?: string;
}) {
  const open = isOpen(node.id);
  const selected = selectedKey === node.key;

  return (
    <li
      role="treeitem"
      aria-selected={selected}
      aria-expanded={node.children.length > 0 ? open : undefined}
      className="grid gap-1"
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
          selected ? "bg-accent-soft" : "hover:bg-surface-3",
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            aria-label={open ? `Collapse ${node.key}` : `Expand ${node.key}`}
            className="grid size-6 place-items-center rounded text-muted hover:bg-surface hover:text-ink"
            onClick={() => toggle(node.id)}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="size-6" aria-hidden="true" />
        )}
        <IssueTypeBadge type={node.type} />
        <Link href={`/projects/${projectKey}/issues/${node.number}`} className="min-w-0 flex-1 truncate font-medium">
          <span className="mr-2 font-mono text-xs text-muted">{node.key}</span>
          {node.title}
        </Link>
        <IssueStatusBadge status={node.status} />
        <IssuePriorityBadge priority={node.priority} />
        {node.type === "EPIC" || node.type === "USER_STORY" ? (
          <span className="tabular-nums text-xs text-muted">{node.progress.percent}%</span>
        ) : null}
        {node.overdue ? <span className="text-xs font-semibold text-danger">Overdue</span> : null}
      </div>
      {open && node.children.length > 0 ? (
        <ul role="group" className="grid gap-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              projectKey={projectKey}
              depth={depth + 1}
              isOpen={isOpen}
              toggle={toggle}
              selectedKey={selectedKey}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
