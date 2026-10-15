"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BrandMark } from "@/components/brand";
import { Icon } from "@/components/shell/icons";
import type { ShellNavigation } from "@/components/shell/navigation";
import { SidebarNav } from "@/components/shell/sidebar-nav";

export function MobileNav({ navigation, workspaceName }: { navigation: ShellNavigation; workspaceName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-surface-2 lg:hidden"
        aria-label="Open navigation"
      >
        <Icon name="menu" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-nav/40 backdrop-blur-[2px] lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-nav px-3 py-4 shadow-pop focus:outline-none lg:hidden">
          <div className="mb-5 flex items-center gap-2.5 px-2">
            <BrandMark inverted />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[15px] font-bold text-white">Workhub</Dialog.Title>
              <Dialog.Description className="truncate text-xs text-nav-muted">{workspaceName}</Dialog.Description>
            </div>
            <Dialog.Close
              className="grid size-8 place-items-center rounded-lg text-nav-text hover:bg-white/10"
              aria-label="Close navigation"
            >
              <Icon name="close" />
            </Dialog.Close>
          </div>
          <SidebarNav navigation={navigation} onNavigate={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
