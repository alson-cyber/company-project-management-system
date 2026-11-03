import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { REPORTS } from "@/modules/reporting/reports.model";
import { requireAuthContext } from "@/server/access/session";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireAuthContext();
  return (
    <>
      <PageHeader
        title="Reports"
        description="Operational reports over projects you can see. An Executive sees the company. An Admin does not gain project data from the Admin role."
      />
      <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report, index) => (
          <li key={report.id}>
            <Link
              href={`/reports/${report.id}`}
              className="group flex h-full gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-card transition-[box-shadow,border-color] hover:border-line-strong hover:shadow-lift"
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-[13px] font-semibold tabular-nums text-accent-strong"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[15px] font-semibold">{report.title}</span>
                <span className="mt-1.5 text-[13px] leading-relaxed text-muted">{report.definition}</span>
                <span className="mt-auto pt-4 text-[13px] font-medium text-accent-strong group-hover:underline">Open report →</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
