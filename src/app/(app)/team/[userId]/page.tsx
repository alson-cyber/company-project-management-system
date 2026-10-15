import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { getWorkspacePerson } from "@/modules/people/people.queries";
import { requireAuthContext } from "@/server/access/session";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }): Promise<Metadata> {
  const { userId } = await params;
  return { title: `Team · ${userId.slice(0, 8)}` };
}

export default async function PersonPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const ctx = await requireAuthContext();
  const person = await getWorkspacePerson(ctx, userId);
  if (!person) notFound();

  return (
    <>
      <PageHeader
        eyebrow={
          <Link href="/team" className="text-[13px] text-muted hover:underline">
            Team
          </Link>
        }
        title={person.name}
        description={[person.jobTitle, person.email].filter(Boolean).join(" · ") || "Workspace member"}
      />
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={person.name} />
        <p className="text-sm text-muted">Projects you can both see. This is not a performance view.</p>
      </div>
      {person.projects.length === 0 ? <p className="text-sm text-muted">No shared projects.</p> : null}
      <ul className="divide-y divide-line/70">
        {person.projects.map((project) => (
          <li key={project.key} className="flex items-center justify-between gap-3 py-3 text-sm">
            <Link href={`/projects/${project.key}`} className="font-medium hover:underline">
              <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: project.color }} aria-hidden="true" />
              {project.name}
              <span className="ml-2 text-muted">{project.key}</span>
            </Link>
            <span className="text-xs text-muted">{project.role === "LEAD" ? "Project lead" : "Member"}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
