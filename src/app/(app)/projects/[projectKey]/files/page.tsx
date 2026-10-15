import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectIssueLink } from "@/components/projects/project-issue-link";
import { ProjectWorkspaceHeader } from "@/components/projects/project-workspace-header";
import { formatBytes, formatDateTime } from "@/components/ui/format";
import { getVisibleProjectByKey } from "@/modules/projects/project.queries";
import { canPreviewAttachment, type AttachmentKind } from "@/modules/projects/workspace.model";
import { listProjectFiles, type ProjectFileRow } from "@/modules/projects/workspace.queries";
import { requireAuthContext } from "@/server/access/session";

export async function generateMetadata({ params }: { params: Promise<{ projectKey: string }> }): Promise<Metadata> {
  const { projectKey } = await params;
  return { title: `${projectKey.toUpperCase()} · Files` };
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const KINDS: Array<{ value: "" | AttachmentKind; label: string }> = [
  { value: "", label: "Any type" },
  { value: "image", label: "Images" },
  { value: "pdf", label: "PDF" },
  { value: "text", label: "Text" },
  { value: "other", label: "Other" },
];

export default async function FilesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { projectKey } = await params;
  const query = await searchParams;
  const ctx = await requireAuthContext();
  const project = await getVisibleProjectByKey(ctx, projectKey);
  if (!project) notFound();

  const files = await listProjectFiles(ctx, project.id, project.key);
  const search = first(query.q).trim().toLowerCase();
  const kind = first(query.kind);
  const uploader = first(query.uploader);
  const visible = files.filter((file) => {
    const nameOk = !search || file.filename.toLowerCase().includes(search);
    const kindOk = !kind || file.kind === kind;
    const uploaderOk = !uploader || file.uploadedBy.id === uploader;
    return nameOk && kindOk && uploaderOk;
  });
  const uploaders = [...new Map(files.map((file) => [file.uploadedBy.id, file.uploadedBy.name])).entries()];
  const filtering = Boolean(search || kind || uploader);

  return (
    <>
      <ProjectWorkspaceHeader project={project} current="files" />
      <form method="get" aria-label="File filters" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="grid min-w-52 flex-1 gap-1 text-xs font-medium text-muted">
          Search filename
          <input
            name="q"
            defaultValue={first(query.q)}
            aria-label="Search filename"
            className="h-10 border border-line bg-surface px-2 text-sm text-ink"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Type
          <select name="kind" defaultValue={kind} aria-label="Type" className="h-10 min-w-32 border border-line bg-surface px-2 text-sm">
            {KINDS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Uploaded by
          <select name="uploader" defaultValue={uploader} aria-label="Uploaded by" className="h-10 min-w-40 border border-line bg-surface px-2 text-sm">
            <option value="">Anyone</option>
            {uploaders.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 px-3 text-[13px] font-semibold text-accent-strong hover:underline">
          Apply
        </button>
        {filtering ? (
          <a href={`/projects/${project.key}/files`} className="h-10 px-2 text-[13px] leading-10 text-muted">
            Reset
          </a>
        ) : null}
      </form>
      {files.length === 0 ? (
        <p className="text-sm text-muted">No files yet. Files added on an issue appear here.</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted">No files match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-semibold text-muted">
                <th scope="col" className="py-2 pr-3 font-semibold">File</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Type</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Size</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Uploaded by</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Uploaded</th>
                <th scope="col" className="py-2 font-semibold">Issue</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((file) => (
                <FileRow key={file.id} projectKey={project.key} file={file} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function FileRow({ projectKey, file }: { projectKey: string; file: ProjectFileRow }) {
  const href = `/api/attachments/${file.id}`;
  return (
    <tr className="border-b border-line/70 align-top">
      <td className="py-3 pr-3">
        <div className="flex items-start gap-3">
          {canPreviewAttachment(file.contentType) ? (
            // Authenticated attachment bytes are streamed by the app, not a public image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={href} alt="" className="size-10 border border-line object-cover" />
          ) : null}
          <div>
            <p className="font-medium">{file.filename}</p>
            <p className="mt-1 flex gap-3 text-xs">
              <Link href={href} className="font-semibold text-accent-strong hover:underline">
                Open
              </Link>
              <Link href={`${href}?download=1`} className="font-semibold text-accent-strong hover:underline">
                Download
              </Link>
            </p>
          </div>
        </div>
      </td>
      <td className="py-3 pr-3 text-muted">{file.contentType}</td>
      <td className="py-3 pr-3 tabular-nums text-muted">{formatBytes(file.sizeBytes)}</td>
      <td className="py-3 pr-3">{file.uploadedBy.name}</td>
      <td className="py-3 pr-3 text-muted">
        <time dateTime={file.createdAt.toISOString()}>{formatDateTime(file.createdAt)}</time>
      </td>
      <td className="py-3">
        <ProjectIssueLink projectKey={projectKey} number={file.issue.number} issueKey={file.issue.key} title={file.issue.title} />
      </td>
    </tr>
  );
}
