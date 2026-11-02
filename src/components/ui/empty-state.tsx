import type { ReactNode } from "react";
import { AllClearIllustration, EmptyBoxIllustration, QuietInboxIllustration } from "@/components/ui/illustrations";

const ILLUSTRATIONS = {
  box: EmptyBoxIllustration,
  clear: AllClearIllustration,
  inbox: QuietInboxIllustration,
} as const;

/** A friendly empty state: an optional small picture, a title, a sentence and an optional action. */
export function EmptyState({
  title,
  children,
  illustration,
  action,
}: {
  title: string;
  children?: ReactNode;
  illustration?: keyof typeof ILLUSTRATIONS;
  action?: ReactNode;
}) {
  const Picture = illustration ? ILLUSTRATIONS[illustration] : null;
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Picture ? <Picture className="mb-3 h-24 w-auto" /> : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children ? <div className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted">{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
