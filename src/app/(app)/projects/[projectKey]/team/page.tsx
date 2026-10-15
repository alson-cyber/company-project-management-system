import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { Avatar } from "@/components/ui/avatar";
import { ProjectRoleBadge } from "@/components/ui/badge";
import { formatDateTime } from "@/components/ui/format";
import { describeActivity } from "@/modules/activity/activity.format";
import { listLatestContributions } from "@/modules/activity/activity.queries";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { memberFacts } from "@/modules/projects/workspace.model";
import { listProjectWorkspaceIssues } from "@/modules/projects/workspace.queries";
import { requireAuthContext } from "@/server/access/session";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string }> }): Promise<Metadata> {
  const { projectKey } = await params;
  return { title: `${projectKey.toUpperCase()} · Team` };
}

export default async function TeamPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();

  const [issues, latest] = await Promise.all([
    listProjectWorkspaceIssues(ctx, project.id),
    listLatestContributions(ctx, project.id),
  ]);

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="team" />
      <p className="mb-3 text-xs text-muted">
        {project.members.length === 1 ? "1 person is on this project." : `${project.members.length} people are on this project.`}{" "}
        Counts are assigned work and recorded completions, not a performance score.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">Person</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Role</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Open</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Overdue</th>
              <th scope="col" className="py-2 pr-3 text-right font-semibold">Completed</th>
              <th scope="col" className="py-2 font-semibold">Last contribution</th>
            </tr>
          </thead>
          <tbody>
            {project.members.map((member) => {
              const facts = memberFacts(member.userId, issues);
              const contribution = latest.get(member.userId);
              return (
                <tr key={member.userId} className="border-b border-line/70">
                  <th scope="row" className="py-3 pr-3 text-left font-medium">
                    <Link href={`/projects/${project.key}/team/${member.userId}`} className="inline-flex items-center gap-2 hover:underline">
                      <Avatar name={member.name} size="sm" />
                      <span>
                        {member.name}
                        {member.status === "DEACTIVATED" ? <span className="ml-2 text-xs font-normal text-muted">Deactivated</span> : null}
                        <span className="block text-xs font-normal text-muted">{member.jobTitle ?? member.email}</span>
                      </span>
                    </Link>
                  </th>
                  <td className="py-3 pr-3">
                    <ProjectRoleBadge role={member.role} />
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">{facts.openAssigned.length}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{facts.overdueAssigned.length}</td>
                  <td className="py-3 pr-3 text-right tabular-nums">{facts.completed.length}</td>
                  <td className="py-3 text-[13px] text-muted">
                    {contribution ? (
                      <>
                        {describeActivity({
                          id: contribution.id,
                          occurredAt: contribution.occurredAt,
                          action: contribution.action,
                          actorName: member.name,
                          before: contribution.before,
                          after: contribution.after,
                        })}
                        <span className="block text-xs">{formatDateTime(contribution.occurredAt)}</span>
                      </>
                    ) : (
                      "No activity yet"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {project.members.length === 0 ? <p className="mt-3 text-sm text-muted">No members yet.</p> : null}
    </>
  );
}
