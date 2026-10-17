import type { ReactNode } from "react";

export function FilterField({ label, name, value, children }: { label: string; name: string; value: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted">
      {label}
      <select name={name} defaultValue={value} aria-label={label} className="h-10 min-w-36 border border-line bg-surface px-2 text-sm text-ink">
        {children}
      </select>
    </label>
  );
}

export function TextFilter({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted">
      {label}
      <input name={name} defaultValue={value} aria-label={label} className="h-10 w-36 border border-line bg-surface px-2 text-sm text-ink" />
    </label>
  );
}
