import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { listWorkspacePeople } from "@/modules/people/people.queries";
import { requireAuthContext } from "@/server/access/session";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await requireAuthContext();
  const people = await listWorkspacePeople(ctx);

  return (
    <>
      <PageHeader
        title="Team"
        description="People in this workspace. Project links are limited to projects you can see. There are no scores or rankings."
      />
      <Card>
        <CardHeader title="People" description={`${people.length} active members. Projects are shown where you can see them.`} />
        <ul className="divide-y divide-line/70">
          {people.map((person) => (
            <li key={person.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={person.name} />
                <div className="min-w-0">
                  <Link href={`/team/${person.id}`} className="truncate text-sm font-medium hover:underline">
                    {person.name}
                  </Link>
                  <p className="truncate text-[13px] text-muted">{person.jobTitle ?? "—"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                {person.projects.map((project) => (
                  <Link
                    key={project.key}
                    href={`/projects/${project.key}`}
                    className="inline-flex h-6 items-center gap-1.5 rounded-md border border-line px-2 text-xs font-medium hover:bg-surface-2"
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: project.color }} aria-hidden="true" />
                    {project.name}
                    {project.role === "LEAD" ? <span className="text-muted">· Lead</span> : null}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
