import type { ReactNode } from "react";
import { FilterInput, FilterSelect, filterLabelClass } from "@/components/ui/filter-fields";

export function FilterField({ label, name, value, children }: { label: string; name: string; value: string; children: ReactNode }) {
  return (
    <label className={`${filterLabelClass} min-w-44`}>
      {label}
      <FilterSelect name={name} defaultValue={value} aria-label={label}>
        {children}
      </FilterSelect>
    </label>
  );
}

export function TextFilter({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className={`${filterLabelClass} w-40`}>
      {label}
      <FilterInput name={name} defaultValue={value} aria-label={label} />
    </label>
  );
}

/** A calendar date picker. The browser shows a calendar and always sends YYYY-MM-DD. */
export function DateFilter({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className={`${filterLabelClass} w-44`}>
      {label}
      <FilterInput type="date" name={name} defaultValue={value} aria-label={label} />
    </label>
  );
}
