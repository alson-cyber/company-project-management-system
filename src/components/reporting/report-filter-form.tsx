"use client";

import type { FormEvent, ReactNode } from "react";

/**
 * A filter form that applies itself. Picking a date switches a Range field to Custom
 * (when the form has one) and submits straight away, so the dates are never left unused.
 */
export function ReportFilterForm({
  action,
  className,
  label,
  children,
}: {
  action?: string;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  function onChange(event: FormEvent<HTMLFormElement>) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== "date" || !input.value) return;
    const form = event.currentTarget;
    const range = form.elements.namedItem("range");
    if (range instanceof HTMLSelectElement) range.value = "custom";
    form.requestSubmit();
  }

  return (
    <form action={action} aria-label={label} className={className} onChange={onChange}>
      {children}
    </form>
  );
}
