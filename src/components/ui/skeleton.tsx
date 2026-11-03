import { cn } from "@/components/ui/cn";

/** A shimmering placeholder bar. Size it with Tailwind classes. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton h-4", className)} />;
}

function Block({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card", className)}
    >
      {children}
    </div>
  );
}

function Status({ label }: { label: string }) {
  return (
    <p role="status" className="sr-only">
      {label}
    </p>
  );
}

function ListRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-[18px] rounded-[4px]" />
          <Skeleton className="h-3.5" />
          <Skeleton className="ml-auto h-3.5 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Page header plus a row of metric tiles and two blocks: dashboards and overviews. */
export function DashboardSkeleton({ label = "Loading…", tiles = 4 }: { label?: string; tiles?: number }) {
  return (
    <div className="grid gap-6">
      <Status label={label} />
      <div className="grid gap-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: tiles }, (_, index) => (
          <Block key={index} className="p-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="mt-3 h-7 w-12" />
            <Skeleton className="mt-2 h-3 w-24" />
          </Block>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Block>
          <Skeleton className="mb-4 h-4 w-32" />
          <ListRows rows={4} />
        </Block>
        <Block>
          <Skeleton className="mb-4 h-4 w-32" />
          <ListRows rows={4} />
        </Block>
      </div>
    </div>
  );
}

/** A filter bar and a list of rows: My Work, Inbox, activity, team. */
export function ListSkeleton({ label = "Loading…", rows = 7 }: { label?: string; rows?: number }) {
  return (
    <div className="grid gap-4">
      <Status label={label} />
      <Skeleton className="h-6 w-48" />
      <Block className="p-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-32" />
          ))}
        </div>
      </Block>
      <Block>
        <ListRows rows={rows} />
      </Block>
    </div>
  );
}

/** Four status columns with a few cards each. */
export function BoardSkeleton({ label = "Loading board…" }: { label?: string }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      <Status label={label} />
      {[3, 2, 2, 1].map((cards, column) => (
        <div
          key={column}
          className="grid w-72 shrink-0 content-start gap-2 rounded-[var(--radius-card)] bg-surface-2 p-2"
        >
          <Skeleton className="m-1 h-3 w-20" />
          {Array.from({ length: cards }, (_, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-line bg-surface p-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3.5" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** The issue detail panel while an issue opens. */
export function InspectorSkeleton({ label = "Loading issue…" }: { label?: string }) {
  return (
    <div className="grid gap-4 px-5 py-5">
      <Status label={label} />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-5 w-14" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3.5" />
      <Skeleton className="h-3.5 w-5/6" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  );
}
