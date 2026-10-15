import Link from "next/link";

export function ProjectIssueLink({
  projectKey,
  number,
  issueKey,
  title,
}: {
  projectKey: string;
  number: number;
  issueKey: string;
  title: string;
}) {
  return (
    <Link
      href={`/projects/${projectKey}/issues/${number}`}
      className="min-w-0 font-medium text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="font-mono text-xs font-semibold text-muted">{issueKey}</span> {title}
    </Link>
  );
}
