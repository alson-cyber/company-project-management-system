import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

type Variant = "primary" | "secondary" | "quiet";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[0_1px_2px_rgba(60,86,219,0.25)] hover:bg-accent-strong disabled:bg-accent/60",
  secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2",
  quiet: "text-muted hover:bg-surface-3 hover:text-ink",
};

const sizes: Record<Size, string> = {
  md: "h-9 px-3.5 text-[13px]",
  lg: "h-11 px-4 text-sm",
};

export function buttonClasses({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-70",
    variants[variant],
    sizes[size],
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonClasses({ variant, size }), className)} {...props} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
