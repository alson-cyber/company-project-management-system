export function Distribution({ items }: { items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span>{item.label}</span>
            <span className="tabular-nums text-muted">{item.count}</span>
          </div>
          <div className="h-1.5 bg-line/80" role="img" aria-label={`${item.label}: ${item.count}`}>
            <div className="h-1.5 bg-ink/80" style={{ width: `${Math.round((item.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
