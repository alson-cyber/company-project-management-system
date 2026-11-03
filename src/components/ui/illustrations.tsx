/**
 * Small, calm illustrations for empty and "all clear" states. They use theme colours,
 * so they suit the light and dark themes. Decorative only.
 */

export function AllClearIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden="true">
      <circle cx="112" cy="34" r="16" className="fill-warning-soft" />
      <circle
        cx="112"
        cy="34"
        r="9"
        className="fill-[color-mix(in_srgb,var(--color-warning)_35%,var(--color-warning-soft))]"
      />
      <path d="M8 92c22-18 40-22 58-14s34 6 50-6 28-10 36-4v42H8z" className="fill-success-soft" />
      <path
        d="M8 98c26-12 48-12 70-4s40 6 74-6v22H8z"
        className="fill-[color-mix(in_srgb,var(--color-success)_18%,var(--color-success-soft))]"
      />
      <rect
        x="44"
        y="30"
        width="44"
        height="54"
        rx="6"
        className="fill-surface stroke-line-strong"
        strokeWidth="1.5"
      />
      <path
        d="m53 46 4 4 7-8M53 60l4 4 7-8M53 74l4 4 7-8"
        fill="none"
        className="stroke-success"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M70 46h10M70 60h10M70 74h10"
        className="stroke-line-strong"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyBoxIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden="true">
      <ellipse cx="80" cy="96" rx="52" ry="7" className="fill-surface-3" />
      <path
        d="M38 48 80 34l42 14v38L80 100 38 86z"
        className="fill-surface stroke-line-strong"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M38 48 80 62l42-14M80 62v38"
        fill="none"
        className="stroke-line-strong"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M38 48 24 62l42 14 14-14z"
        className="fill-surface-3 stroke-line-strong"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m122 48 14 14-42 14-14-14z"
        className="fill-surface-3 stroke-line-strong"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="58" cy="22" r="4" className="fill-epic/60" />
      <circle cx="98" cy="16" r="3" className="fill-task/60" />
      <circle cx="112" cy="28" r="3.5" className="fill-story/60" />
    </svg>
  );
}

export function QuietInboxIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden="true">
      <ellipse cx="80" cy="98" rx="50" ry="6" className="fill-surface-3" />
      <path
        d="M36 58 52 30h56l16 28v32a4 4 0 0 1-4 4H40a4 4 0 0 1-4-4z"
        className="fill-surface stroke-line-strong"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M36 58h26l6 10h24l6-10h26"
        fill="none"
        className="stroke-line-strong"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M118 18c4 0 6 2 6 6M126 12c6 1 9 5 9 11"
        fill="none"
        className="stroke-info/50"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
