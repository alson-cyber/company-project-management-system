import "server-only";
import { issueKey, parseIssueKey } from "@/modules/issues/issue.keys";
import { visibleProjectsWhere } from "@/modules/projects/project.queries";
import { hasWorkspacePermission } from "@/server/access/policy";
import type { AuthContext } from "@/server/access/types";
import { prisma } from "@/server/db";

const RESULT_LIMIT = 8;
const QUERY_LIMIT = 80;

export interface SearchProject {
  id: string;
  key: string;
  name: string;
  href: string;
}

export interface SearchIssue {
  id: string;
  key: string;
  title: string;
  projectName: string;
  href: string;
}

export interface SearchPerson {
  id: string;
  name: string;
  jobTitle: string | null;
  email: string | null;
  href: string;
}

export interface SearchResults {
  query: string;
  projects: SearchProject[];
  issues: SearchIssue[];
  people: SearchPerson[];
}

const empty = (query: string): SearchResults => ({ query, projects: [], issues: [], people: [] });

/** Permission-aware search. Issue and project content follow project visibility. Email is admin-only. */
export async function searchWorkspace(ctx: AuthContext, rawQuery: string): Promise<SearchResults> {
  const query = rawQuery.trim().replace(/\s+/g, " ").slice(0, QUERY_LIMIT);
  if (query.length < 2) return empty(query);

  const projectWhere = visibleProjectsWhere(ctx);
  const parsed = parseIssueKey(query);
  const canSeeEmail = hasWorkspacePermission(ctx, "admin.access");

  const [projects, issues, people] = await Promise.all([
    prisma.project.findMany({
      where: {
        AND: [
          projectWhere,
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { key: { contains: query.toUpperCase(), mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, key: true, name: true },
      orderBy: { name: "asc" },
      take: RESULT_LIMIT,
    }),
    prisma.issue.findMany({
      where: {
        archivedAt: null,
        OR: [
          { title: { contains: query, mode: "insensitive" }, project: projectWhere },
          ...(parsed
            ? [{ number: parsed.number, project: { ...projectWhere, key: parsed.projectKey } }]
            : []),
        ],
      },
      select: { id: true, number: true, title: true, project: { select: { key: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: RESULT_LIMIT,
    }),
    prisma.user.findMany({
      where: {
        status: "ACTIVE",
        workspaceMemberships: { some: { workspaceId: ctx.workspace.id } },
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          ...(canSeeEmail ? [{ email: { contains: query, mode: "insensitive" as const } }] : []),
        ],
      },
      select: { id: true, name: true, jobTitle: true, email: true },
      orderBy: { name: "asc" },
      take: RESULT_LIMIT,
    }),
  ]);

  return {
    query,
    projects: projects.map((project) => ({ ...project, href: `/projects/${project.key}` })),
    issues: issues.map((issue) => ({
      id: issue.id,
      key: issueKey(issue.project.key, issue.number),
      title: issue.title,
      projectName: issue.project.name,
      href: `/issues/${issueKey(issue.project.key, issue.number)}`,
    })),
    people: people.map((person) => ({
      id: person.id,
      name: person.name,
      jobTitle: person.jobTitle,
      email: canSeeEmail ? person.email : null,
      href: `/team/${person.id}`,
    })),
  };
}
