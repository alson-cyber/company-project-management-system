import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children ? <div className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">{children}</div> : null}
    </div>
  );
}
