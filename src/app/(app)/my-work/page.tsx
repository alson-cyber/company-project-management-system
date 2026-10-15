import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthContext } from "@/server/access/session";

export const metadata: Metadata = { title: "My Work" };

export default async function MyWorkPage() {
  await requireAuthContext();
  return (
    <>
      <PageHeader title="My Work" description="Your assigned work across every project." />
      <Card>
        <EmptyState title="Work items are not available yet">
          Epics, User Stories, Tasks and Sub-tasks assigned to you will appear here once the issue hierarchy is
          enabled.
        </EmptyState>
      </Card>
    </>
  );
}
