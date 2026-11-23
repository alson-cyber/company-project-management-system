"use client";

import { useState } from "react";
import {
  addCommentAction,
  addNoteAction,
  removeAttachmentAction,
  removeCommentAction,
  removeNoteAction,
  updateCommentAction,
  updateNoteAction,
} from "@/app/(app)/issues/collaboration-actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";
import { formatDateTime, toDate } from "@/components/ui/format";
import { NOTE_CATEGORIES, NOTE_CATEGORY_LABELS } from "@/modules/collaboration/collaboration.schema";
import { formatBytes } from "@/modules/collaboration/files";
import type { AttachmentView, CommentView, NoteView } from "@/modules/collaboration/collaboration.queries";
import { useRouter } from "next/navigation";

interface IssueTarget {
  id: string;
  number: number;
  projectKey: string;
  canMutate: boolean;
  archived: boolean;
}

export function NotesPanel({
  issue,
  notes,
  viewerId,
  canModerate,
}: {
  issue: IssueTarget;
  notes: NoteView[];
  viewerId: string;
  canModerate: boolean;
}) {
  return (
    <div className="grid gap-4">
      {notes.length === 0 ? <p className="text-sm text-muted">No notes yet.</p> : null}
      <ul className="grid">
        {notes.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            issue={issue}
            canRevise={issue.canMutate && !issue.archived && (note.author.id === viewerId || canModerate)}
          />
        ))}
      </ul>
      {issue.canMutate && !issue.archived ? <Composer issue={issue} kind="note" /> : null}
    </div>
  );
}

export function CommentsPanel({
  issue,
  comments,
  viewerId,
  canModerate,
}: {
  issue: IssueTarget;
  comments: CommentView[];
  viewerId: string;
  canModerate: boolean;
}) {
  return (
    <div className="grid gap-4">
      {comments.length === 0 ? <p className="text-sm text-muted">No comments yet.</p> : null}
      <ol className="grid">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            issue={issue}
            canRevise={issue.canMutate && !issue.archived && (comment.author.id === viewerId || canModerate)}
          />
        ))}
      </ol>
      {issue.canMutate && !issue.archived ? <Composer issue={issue} kind="comment" /> : null}
    </div>
  );
}

export function AttachmentsPanel({ issue, attachments }: { issue: IssueTarget; attachments: AttachmentView[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
      {uploading ? <p className="text-sm text-muted">Uploading…</p> : null}
      {attachments.length === 0 && !uploading ? <p className="text-sm text-muted">No attachments yet.</p> : null}
      <ul className="grid">
        {attachments.map((attachment) => (
          <li key={attachment.id} className="border-b border-line py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="min-w-0 text-sm font-medium">{attachment.filename}</p>
              <p className="text-xs text-muted">
                {formatBytes(attachment.sizeBytes)} · {attachment.contentType}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">
              {attachment.uploadedBy.name} · {formatDateTime(attachment.createdAt)}
            </p>
            {attachment.previewable ? (
              // Filename is the accessible name beside this preview.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/attachments/${attachment.id}`}
                alt=""
                className="mt-2 max-h-40 max-w-full rounded border border-line object-contain"
              />
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <a className="text-[13px] font-semibold text-accent-strong" href={`/api/attachments/${attachment.id}`}>
                Open
              </a>
              <a
                className="text-[13px] font-semibold text-accent-strong"
                href={`/api/attachments/${attachment.id}?download=1`}
              >
                Download
              </a>
              {issue.canMutate && !issue.archived ? (
                <button
                  type="button"
                  className="text-[13px] font-semibold text-muted"
                  disabled={pendingId === attachment.id}
                  onClick={() => {
                    if (!window.confirm(`Remove ${attachment.filename}?`)) return;
                    setPendingId(attachment.id);
                    setError(null);
                    const form = targetForm(issue, { attachmentId: attachment.id });
                    void removeAttachmentAction(null, form).then((result) => {
                      setPendingId(null);
                      if (!result?.ok) {
                        setError(result?.error.message ?? "Could not remove the attachment.");
                        return;
                      }
                      router.refresh();
                    });
                  }}
                >
                  {pendingId === attachment.id ? "Removing…" : "Remove"}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {issue.canMutate && !issue.archived ? (
        <div>
          <label htmlFor="issue-attachment" className="text-[13px] font-medium">
            Upload attachment
          </label>
          <input
            id="issue-attachment"
            type="file"
            className="mt-1 block w-full text-sm"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setUploading(true);
              setError(null);
              const body = new FormData();
              body.set("file", file);
              void fetch(`/api/issues/${issue.id}/attachments`, { method: "POST", body }).then(async (response) => {
                setUploading(false);
                if (!response.ok) {
                  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                  setError(payload?.error ?? "Upload failed.");
                  return;
                }
                router.refresh();
              });
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function NoteItem({ note, issue, canRevise }: { note: NoteView; issue: IssueTarget; canRevise: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [category, setCategory] = useState(note.category);
  const [draft, setDraft] = useState(note.content);
  const [history, setHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!editing && (title !== note.title || category !== note.category || draft !== note.content)) {
    setTitle(note.title);
    setCategory(note.category);
    setDraft(note.content);
  }

  return (
    <li className="border-b border-line py-3">
      <div className="flex items-center gap-2">
        <Avatar name={note.author.name} size="sm" />
        <p className="min-w-0 text-sm">
          <span className="font-semibold">{note.author.name}</span>
          <span className="text-muted"> · {formatDateTime(note.createdAt)}</span>
          <span className="text-muted"> · {NOTE_CATEGORY_LABELS[note.category]}</span>
        </p>
      </div>
      {editing ? (
        <div className="mt-2 grid gap-2">
          <label className="grid gap-1 text-[13px] font-medium">
            Title
            <input className="h-9 rounded-md border border-line bg-surface px-2 text-sm" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="grid gap-1 text-[13px] font-medium">
            Category
            <select className="h-9 rounded-md border border-line bg-surface px-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value as NoteView["category"])}>
              {NOTE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {NOTE_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <TextArea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} aria-label="Note" />
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={pending || title.trim().length === 0 || draft.trim().length === 0}
              onClick={() => {
                setPending(true);
                setError(null);
                void updateNoteAction(null, targetForm(issue, { noteId: note.id, title, category, content: draft })).then((result) => {
                  setPending(false);
                  if (!result?.ok) {
                    setError(result?.error?.message ?? "Could not save the note.");
                    return;
                  }
                  setEditing(false);
                  router.refresh();
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="quiet" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold">{note.title}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{note.content}</p>
        </>
      )}
      {error ? <p role="alert" className="mt-2 text-[13px] font-medium text-danger">{error}</p> : null}
      {canRevise && !editing ? (
        <div className="mt-2 flex gap-3">
          <button type="button" className="text-[13px] font-semibold text-muted" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" className="text-[13px] font-semibold text-muted" onClick={() => removeNoteAction(null, targetForm(issue, { noteId: note.id })).then(() => router.refresh())}>
            Remove
          </button>
        </div>
      ) : null}
      {note.revisions.length > 1 ? (
        <div className="mt-2">
          <button type="button" className="text-[13px] font-semibold text-muted" onClick={() => setHistory((current) => !current)}>
            {history ? "Hide history" : `${note.revisions.length} revisions`}
          </button>
          {history ? (
            <ol className="mt-2 grid gap-2">
              {note.revisions.map((revision) => (
                <li key={revision.revision} className="rounded-md border border-line px-3 py-2 text-sm">
                  <p className="text-xs text-muted">
                    Revision {revision.revision} · {NOTE_CATEGORY_LABELS[revision.category]} · {revision.editorName} · {formatDateTime(revision.createdAt)}
                  </p>
                  <p className="mt-1 font-medium">{revision.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted">{revision.content}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function CommentItem({
  comment,
  issue,
  canRevise,
}: {
  comment: CommentView;
  issue: IssueTarget;
  canRevise: boolean;
}) {
  if (comment.deleted || comment.body === null) {
    return (
      <li className="border-b border-line py-3 text-sm text-muted">
        A comment from {comment.author.name} was removed · {formatDateTime(comment.createdAt)}
      </li>
    );
  }
  return (
    <EditableEntry
      issue={issue}
      author={comment.author}
      createdAt={comment.createdAt}
      updatedAt={comment.updatedAt}
      text={comment.body}
      canRevise={canRevise}
      label="comment"
      recordId={comment.id}
      onSave={(body) => updateCommentAction(null, targetForm(issue, { commentId: comment.id, body }))}
      onRemove={() => removeCommentAction(null, targetForm(issue, { commentId: comment.id }))}
    />
  );
}

function EditableEntry({
  author,
  createdAt,
  updatedAt,
  text,
  canRevise,
  label,
  recordId,
  onSave,
  onRemove,
}: {
  issue: IssueTarget;
  author: { id: string; name: string };
  createdAt: Date | string;
  updatedAt: Date | string;
  text: string;
  canRevise: boolean;
  label: "note" | "comment";
  recordId: string;
  onSave: (value: string) => Promise<{ ok: boolean; error?: { message: string } } | null>;
  onRemove: () => Promise<{ ok: boolean; error?: { message: string } } | null>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const created = toDate(createdAt);
  const updated = toDate(updatedAt);
  const edited = created && updated ? updated.getTime() - created.getTime() > 1000 : false;
  if (!editing && draft !== text) setDraft(text);

  return (
    <li className="border-b border-line py-3">
      <div className="flex items-center gap-2">
        <Avatar name={author.name} size="sm" />
        <p className="min-w-0 text-sm">
          <span className="font-semibold">{author.name}</span>
          <span className="text-muted"> · {formatDateTime(createdAt)}</span>
          {edited ? <span className="text-muted"> · Edited</span> : null}
        </p>
      </div>
      {editing ? (
        <div className="mt-2 grid gap-2">
          <label className="sr-only" htmlFor={`${label}-${recordId}`}>
            Edit {label}
          </label>
          <TextArea id={`${label}-${recordId}`} value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} />
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={pending || draft.trim().length === 0}
              onClick={() => {
                setPending(true);
                setError(null);
                void onSave(draft).then((result) => {
                  setPending(false);
                  if (!result?.ok) {
                    setError(result?.error?.message ?? `Could not save the ${label}.`);
                    return;
                  }
                  setEditing(false);
                  router.refresh();
                });
              }}
            >
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="quiet"
              onClick={() => {
                setDraft(text);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
      {canRevise && !editing ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className="text-[13px] font-semibold text-muted" onClick={() => setEditing(true)}>
            Edit
          </button>
          {confirming ? (
            <>
              <span className="text-[13px] text-muted">Remove this {label}?</span>
              <button
                type="button"
                className="text-[13px] font-semibold text-danger"
                onClick={() => {
                  setPending(true);
                  setError(null);
                  void onRemove().then((result) => {
                    setPending(false);
                    if (!result?.ok) {
                      setError(result?.error?.message ?? `Could not remove the ${label}.`);
                      return;
                    }
                    router.refresh();
                  });
                }}
              >
                Remove
              </button>
              <button type="button" className="text-[13px] font-semibold text-muted" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="text-[13px] font-semibold text-muted" onClick={() => setConfirming(true)}>
              Remove
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}

function Composer({ issue, kind }: { issue: IssueTarget; kind: "note" | "comment" }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof NOTE_CATEGORIES)[number]>("PRODUCT");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const label = kind === "note" ? "Internal note" : "Comment";
  const noteReady = title.trim().length > 0 && draft.trim().length > 0;

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (kind === "note" ? !noteReady : !draft.trim()) return;
        setPending(true);
        setError(null);
        const form = targetForm(issue, kind === "note" ? { title, category, content: draft } : { body: draft });
        const action = kind === "note" ? addNoteAction : addCommentAction;
        void action(null, form).then((result) => {
          setPending(false);
          if (!result?.ok) {
            setError(result?.error.message ?? `Could not add the ${kind}.`);
            return;
          }
          setDraft("");
          setTitle("");
          router.refresh();
        });
      }}
    >
      <label htmlFor={`new-${kind}`} className="text-[13px] font-medium">
        {label}
      </label>
      {kind === "note" ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
          <input
            aria-label="Note title"
            value={title}
            placeholder="Title"
            className="h-9 rounded-md border border-line bg-surface px-2 text-sm"
            onChange={(event) => setTitle(event.target.value)}
          />
          <select
            aria-label="Note category"
            value={category}
            className="h-9 rounded-md border border-line bg-surface px-2 text-sm"
            onChange={(event) => setCategory(event.target.value as (typeof NOTE_CATEGORIES)[number])}
          >
            {NOTE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {NOTE_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <TextArea
        id={`new-${kind}`}
        value={draft}
        rows={3}
        placeholder={kind === "note" ? "Add an internal note" : "Add a comment"}
        onChange={(event) => setDraft(event.target.value)}
      />
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
      <div>
        <Button type="submit" variant="secondary" disabled={pending || (kind === "note" ? !noteReady : draft.trim().length === 0)}>
          {pending ? "Saving…" : kind === "note" ? "Add note" : "Add comment"}
        </Button>
      </div>
    </form>
  );
}

function targetForm(issue: IssueTarget, fields: Record<string, string>) {
  const form = new FormData();
  form.set("issueId", issue.id);
  form.set("projectKey", issue.projectKey);
  form.set("issueNumber", String(issue.number));
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}
