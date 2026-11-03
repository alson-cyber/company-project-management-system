"use client";

import type { ReactNode } from "react";
import { FilterApplyButton } from "@/components/ui/filter-fields";

/**
 * A GET form that applies itself as soon as a filter changes, so there is no Apply button.
 * Without JavaScript the browser still submits it with the visible "Apply" button.
 */
export function AutoSubmitForm({ children, label }: { children: ReactNode; label: string }) {
  return (
    <form
      method="get"
      aria-label={label}
      className="flex flex-wrap items-end gap-2"
      onChange={(event) => {
        const form = event.currentTarget;
        // Leave out filters set to their default so the address stays short and readable.
        const skipped: HTMLSelectElement[] = [];
        for (const field of Array.from(form.elements)) {
          if (field instanceof HTMLSelectElement && (field.value === "" || (field.name === "sort" && field.value === "due"))) {
            field.disabled = true;
            skipped.push(field);
          }
        }
        form.requestSubmit();
        for (const field of skipped) field.disabled = false;
      }}
    >
      {children}
      <noscript>
        <FilterApplyButton />
      </noscript>
    </form>
  );
}
