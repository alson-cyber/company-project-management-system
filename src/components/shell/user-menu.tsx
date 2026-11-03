"use client";

import { useSyncExternalStore } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOutAction } from "@/app/actions/session";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/shell/icons";
import { getTheme, setTheme, subscribeTheme, type ThemeChoice } from "@/components/shell/theme";

const THEME_OPTIONS: Array<{ value: ThemeChoice; label: string }> = [
  { value: "system", label: "Match my computer" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function UserMenu({ name, email, roles }: { name: string; email: string; roles: string[] }) {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => "system" as ThemeChoice);
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
          <DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Appearance
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemeChoice)}>
            {THEME_OPTIONS.map((option) => (
              <DropdownMenu.RadioItem
                key={option.value}
                value={option.value}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none data-[highlighted]:bg-surface-3"
              >
                <span className="grid size-4 place-items-center" aria-hidden="true">
                  <DropdownMenu.ItemIndicator>
                    <span className="block size-1.5 rounded-full bg-ink" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {option.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
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
