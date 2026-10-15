import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthContext } from "@/server/access/session";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireAuthContext();
  return (
    <>
      <PageHeader title="Reports" description="Project and delivery reporting." />
      <Card>
        <EmptyState title="Reports are not available yet">
          Reports are built on recorded work and activity, so they arrive after the issue hierarchy and activity
          history are in place.
        </EmptyState>
      </Card>
    </>
  );
}
