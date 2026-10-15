import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireAuthContext } from "@/server/access/session";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  await requireAuthContext();
  return (
    <>
      <PageHeader title="Inbox" description="Updates, mentions and work that needs your response." />
      <Card>
        <EmptyState title="Notifications are not available yet">
          Mentions, assignments and status changes on your work will be collected here in a later stage.
        </EmptyState>
      </Card>
    </>
  );
}
