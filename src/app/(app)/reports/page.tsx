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
      <ul className="divide-y divide-line/70">
        {REPORTS.map((report) => (
          <li key={report.id} className="py-3">
            <Link href={`/reports/${report.id}`} className="text-sm font-semibold hover:underline">
              {report.title}
            </Link>
            <p className="mt-1 text-sm text-muted">{report.definition}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
