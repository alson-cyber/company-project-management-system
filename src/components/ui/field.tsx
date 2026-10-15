import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";

export const controlClasses =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted-2 " +
  "transition-colors hover:border-line-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/15 " +
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15 disabled:bg-surface-3";

export function Field({
  id,
  label,
  hint,
  errors,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  errors?: string[] | undefined;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !errors?.length ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
      {errors?.length ? (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, errors?: string[], hint?: unknown): string | undefined {
  if (errors?.length) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, "h-10", className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClasses, "h-10 pr-8", className)} {...props} />;
}

export function FormAlert({ tone = "error", children }: { tone?: "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2.5 text-[13px] leading-snug",
        tone === "error" ? "border-danger/25 bg-danger-soft text-danger" : "border-success/25 bg-success-soft text-success",
      )}
    >
      {children}
    </div>
  );
}
