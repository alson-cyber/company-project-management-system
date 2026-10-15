import type { Metadata } from "next";
import Link from "next/link";
import { ProjectTable } from "@/components/projects/project-table";
import { buttonClasses } from "@/components/ui/button";
import { formatDate } from "@/components/ui/format";
import { PageHeader } from "@/components/ui/page-header";
import { countUnread } from "@/modules/attention/attention.queries";
import { filterMyWork } from "@/modules/attention/attention.rules";
import { loadMyWork } from "@/modules/attention/my-work.queries";
import { listMyProjects } from "@/modules/projects/project.queries";
import { describeAccess } from "@/server/access/describe";
import { hasWorkspacePermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await requireAuthContext();
  const timeZone = getEnv().COMPANY_TIMEZONE;
  const [projects, issues, unread] = await Promise.all([listMyProjects(ctx), loadMyWork(ctx), countUnread(ctx)]);
  const shared = { projectId: "", status: "", type: "", priority: "", due: "" as const };
  const overdue = filterMyWork(issues, ctx.userId, { ...shared, view: "overdue", sort: "due" }, timeZone).slice(0, 5);
  const soon = filterMyWork(issues, ctx.userId, { ...shared, view: "soon", sort: "due" }, timeZone).slice(0, 5);
  const updated = filterMyWork(issues, ctx.userId, { ...shared, view: "updated", sort: "updated" }, timeZone).slice(0, 6);
  const firstName = ctx.user.name.split(" ")[0] ?? ctx.user.name;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={describeAccess(ctx).join(" · ")}
        actions={
          hasWorkspacePermission(ctx, "executive.view") ? (
            <Link href="/executive" className={buttonClasses({ variant: "secondary" })}>
              Executive overview
            </Link>
          ) : null
        }
      />

      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="dash-attention">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="dash-attention" className="text-sm font-semibold">
              Needs attention
            </h2>
            <Link href="/inbox" className="text-[13px] font-semibold text-accent-strong hover:underline">
              {unread === 0 ? "Inbox" : `Inbox · ${unread} unread`}
            </Link>
          </div>
          {overdue.length === 0 && soon.length === 0 ? (
            <p className="text-sm text-muted">No overdue or due-soon work is assigned to you.</p>
          ) : null}
          <AttentionList title="Overdue" href="/my-work?view=overdue" items={overdue} />
          <AttentionList title="Due soon" href="/my-work?view=soon" items={soon} />
        </section>
        <section aria-labelledby="dash-updated">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="dash-updated" className="text-sm font-semibold">
              Recently updated
            </h2>
            <Link href="/my-work?view=updated&sort=updated" className="text-[13px] text-muted hover:underline">
              My Work
            </Link>
          </div>
          <UpdatedList issues={updated} />
        </section>
      </div>

      <section aria-labelledby="dash-projects">
        <h2 id="dash-projects" className="mb-2 text-sm font-semibold">
          Your projects
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted">You are not a member of any project yet.</p>
        ) : (
          <ProjectTable projects={projects} />
        )}
      </section>
    </>
  );
}

function AttentionList({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: { id: string; key: string; title: string; dueDate: string | null; projectName: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <Link href={href} className="hover:underline">
          {title}
        </Link>
      </h3>
      <ul className="divide-y divide-line/70">
        {items.map((issue) => (
          <li key={issue.id} className="py-2 text-sm">
            <Link href={`/issues/${issue.key}`} className="font-medium hover:underline">
              <span className="mr-2 text-muted">{issue.key}</span>
              {issue.title}
            </Link>
            <p className="text-xs text-muted">
              {issue.projectName}
              {issue.dueDate ? ` · ${formatDate(issue.dueDate)}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UpdatedList({
  issues,
}: {
  issues: { id: string; key: string; title: string; projectName: string; updatedAt: string }[];
}) {
  if (issues.length === 0) return <p className="text-sm text-muted">No open work assigned to you was updated in the last 14 days.</p>;
  return (
    <ul className="divide-y divide-line/70">
      {issues.map((issue) => (
        <li key={issue.id} className="py-2 text-sm">
          <Link href={`/issues/${issue.key}`} className="font-medium hover:underline">
            <span className="mr-2 text-muted">{issue.key}</span>
            {issue.title}
          </Link>
          <p className="text-xs text-muted">
            {issue.projectName} · {formatDate(issue.updatedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
