import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

/** Caption above every filter field. */
export const filterLabelClass = "grid gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-2";

/** The one look for filter fields: a soft rounded box with explicit fill, border and text colour, so browser defaults never show through. */
export const filterControlClass =
  "h-10 w-full min-w-0 appearance-none rounded-xl border border-line-strong bg-surface-2 px-3 text-sm font-normal text-muted placeholder:text-muted-2 outline-none transition-colors hover:border-muted-2 focus:border-accent focus:text-ink focus:ring-3 focus:ring-accent/15";

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FilterSelect({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...props} className={`${filterControlClass} pr-9 ${className}`}>
        {children}
      </select>
      <Chevron />
    </span>
  );
}

export function FilterInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${filterControlClass} ${className}`} />;
}

/** The one Apply button for filter forms: solid, same height and corners as the fields beside it. */
export function FilterApplyButton({ children = "Apply" }: { children?: ReactNode }) {
  return (
    <button
      type="submit"
      className="h-10 w-full min-w-24 rounded-xl bg-accent px-4 text-[13px] font-semibold text-on-accent transition-opacity hover:opacity-90 sm:w-auto"
    >
      {children}
    </button>
  );
}
