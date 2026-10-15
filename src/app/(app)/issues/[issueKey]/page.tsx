import { notFound, redirect } from "next/navigation";
import { parseIssueKey } from "@/modules/issues/issue.keys";
import { getVisibleIssueByNumber } from "@/modules/issues/issue.queries";
import { requireAuthContext } from "@/server/access/session";

/** Permalink: /issues/AQUA-12 → /projects/AQUA/issues/12 */
export default async function IssuePermalinkPage({ params }: { params: Promise<{ issueKey: string }> }) {
  const { issueKey } = await params;
  const parsed = parseIssueKey(issueKey);
  if (!parsed) notFound();

  const ctx = await requireAuthContext();
  const issue = await getVisibleIssueByNumber(ctx, parsed.projectKey, parsed.number);
  if (!issue) notFound();

  redirect(`/projects/${parsed.projectKey}/issues/${parsed.number}`);
}
