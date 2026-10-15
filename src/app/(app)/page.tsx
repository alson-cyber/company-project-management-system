import type { Metadata } from "next";
import Link from "next/link";
import { ProjectTable } from "@/components/projects/project-table";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { listMyProjects } from "@/modules/projects/project.queries";
import { describeAccess } from "@/server/access/describe";
import { hasWorkspacePermission } from "@/server/access/policy";
import { requireAuthContext } from "@/server/access/session";

export const metadata: Metadata = { title: "Dashboard" };

function Fact({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface px-5 py-4 shadow-card">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1.5 text-[28px] font-semibold tabular-nums tracking-[-0.03em]">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{detail}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await requireAuthContext();
  const projects = await listMyProjects(ctx);
  const leading = projects.filter((project) => project.viewerRole === "LEAD").length;
  const flagged = projects.filter((project) => project.health === "AT_RISK" || project.health === "BLOCKED").length;
  const firstName = ctx.user.name.split(" ")[0] ?? ctx.user.name;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`Signed in as ${describeAccess(ctx).join(" · ")}.`}
        actions={
          hasWorkspacePermission(ctx, "executive.view") ? (
            <Link href="/executive" className={buttonClasses({ variant: "secondary" })}>
              Executive overview
            </Link>
          ) : null
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Fact label="Your projects" value={projects.length} detail="Projects you are a member of" />
        <Fact label="Projects you lead" value={leading} detail="You can set health and manage these" />
        <Fact label="Flagged by leads" value={flagged} detail="Your projects marked At risk or Blocked" />
      </div>

      <Card>
        <CardHeader title="Your projects" description="Projects where you are a member or lead." />
        {projects.length === 0 ? (
          <EmptyState title="You are not a member of any project yet">
            A project lead or administrator can add you to a project.
          </EmptyState>
        ) : (
          <ProjectTable projects={projects} />
        )}
      </Card>
    </>
  );
}
