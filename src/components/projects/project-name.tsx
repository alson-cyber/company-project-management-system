/** A project name with its colour dot in front, so the same project reads the same wherever it is listed. */
export function ProjectName({ name, color, className = "" }: { name: string; color?: string | null; className?: string }) {
  if (!color) return <span className={className}>{name}</span>;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}
