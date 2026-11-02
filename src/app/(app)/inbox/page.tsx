import { EmptyState } from "@/components/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { MarkAllRead, MarkRead } from "@/components/attention/inbox-controls";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/components/ui/format";
import { calendarDayInTimeZone } from "@/lib/calendar";
import { countUnread, listInbox } from "@/modules/attention/attention.queries";
import { requireAuthContext } from "@/server/access/session";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "Inbox" };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireAuthContext();
  const params = await searchParams;
  const unreadOnly = first(params.state) === "unread";
  const [items, unread] = await Promise.all([listInbox(ctx, { unreadOnly }), countUnread(ctx)]);
  const timeZone = getEnv().COMPANY_TIMEZONE;
  const today = calendarDayInTimeZone(new Date(), timeZone);

  const groups = [
    { id: "today", label: "Today", items: items.filter((item) => calendarDayInTimeZone(item.createdAt, timeZone) === today) },
    { id: "earlier", label: "Earlier", items: items.filter((item) => calendarDayInTimeZone(item.createdAt, timeZone) !== today) },
  ].filter((group) => group.items.length > 0);

  return (
    <>
      <PageHeader
        title="Inbox"
        description="What needs your attention. Project Activity stays the full history of a project."
        actions={unread > 0 || !unreadOnly ? <MarkAllRead /> : null}
      />
      <div className="mb-4 flex items-center gap-3 text-sm">
        <Link href="/inbox" aria-current={unreadOnly ? undefined : "page"} className={unreadOnly ? "text-muted" : "font-semibold"}>
          All
        </Link>
        <Link href="/inbox?state=unread" aria-current={unreadOnly ? "page" : undefined} className={unreadOnly ? "font-semibold" : "text-muted"}>
          Unread
        </Link>
        <span className="text-xs text-muted">{unread === 0 ? "No unread" : `${unread} unread`}</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-line bg-surface shadow-card">
          <EmptyState title={unreadOnly ? "No unread notifications." : "Your inbox is empty."} illustration="inbox">
            When someone assigns you work, mentions you or something you follow changes, it shows up here.
          </EmptyState>
        </div>
      ) : null}
      <div className="grid gap-6">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`inbox-${group.id}`}>
            <h2 id={`inbox-${group.id}`} className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {group.label}
            </h2>
            <ol className="divide-y divide-line/70">
              {group.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm">
                      {item.readAt === null ? (
                        <span className="mr-2 inline-block size-1.5 translate-y-[-1px] rounded-full bg-accent" aria-hidden="true" />
                      ) : null}
                      <Link href={`/inbox/open/${item.id}`} className={item.readAt ? "text-muted hover:underline" : "font-semibold hover:underline"}>
                        {item.sentence}
                      </Link>
                      <span className="sr-only">{item.readAt ? " Read" : " Unread"}</span>
                    </p>
                    {item.issueTitle ? (
                      <p className="mt-0.5 text-[13px] text-muted">
                        {item.issueKey} {item.issueTitle}
                      </p>
                    ) : null}
                    {item.detail ? <p className="mt-0.5 text-[13px] text-muted">{item.detail}</p> : null}
                    <time className="text-xs text-muted-2" dateTime={item.createdAt.toISOString()}>
                      {formatDateTime(item.createdAt)}
                    </time>
                  </div>
                  {item.readAt === null ? <MarkRead id={item.id} /> : null}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
