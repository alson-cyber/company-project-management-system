"use client";

import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "@/components/shell/icons";

export interface BellItem {
  id: string;
  sentence: string;
  unread: boolean;
  href: string;
}

export function InboxBell({ count, items }: { count: number; items: BellItem[] }) {
  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications, no unread";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="relative grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-surface-2"
        aria-label={label}
      >
        <Icon name="inbox" className="size-4" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-surface">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[min(360px,calc(100vw-1.5rem))] rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          <div className="flex items-center justify-between px-2.5 py-2">
            <p className="text-sm font-semibold">Inbox</p>
            <span className="text-xs text-muted">{count > 0 ? `${count} unread` : "All caught up"}</span>
          </div>
          {items.length === 0 ? <p className="px-2.5 py-4 text-sm text-muted">No notifications yet.</p> : null}
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <DropdownMenu.Item asChild>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-surface-3"
                  >
                    <span className={item.unread ? "font-semibold" : "text-muted"}>{item.sentence}</span>
                    {item.unread ? <span className="sr-only"> Unread</span> : null}
                  </Link>
                </DropdownMenu.Item>
              </li>
            ))}
          </ul>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <Link href="/inbox" className="block rounded-lg px-2.5 py-2 text-sm font-semibold text-accent-strong outline-none data-[highlighted]:bg-surface-3">
              View all
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
