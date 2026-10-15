"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOutAction } from "@/app/actions/session";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/shell/icons";

export function UserMenu({ name, email, roles }: { name: string; email: string; roles: string[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-sm hover:bg-surface-3 data-[state=open]:bg-surface-3"
        aria-label={`Account menu for ${name}`}
      >
        <Avatar name={name} size="sm" />
        <span className="hidden max-w-40 truncate font-medium sm:block">{name}</span>
        <Icon name="chevronDown" className="size-3.5 text-muted" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted">{email}</p>
            <p className="mt-1.5 text-xs text-muted">{roles.join(" · ")}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <form action={signOutAction}>
            <DropdownMenu.Item asChild>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none data-[highlighted]:bg-surface-3"
              >
                <Icon name="logout" className="size-4 text-muted" />
                Sign out
              </button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
