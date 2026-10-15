import { openAttachment } from "@/modules/collaboration/collaboration.service";
import { getActionAuthContext } from "@/server/access/session";
import { AppError, UnauthenticatedError } from "@/server/errors";

export const runtime = "nodejs";

function errorResponse(error: unknown): Response {
  if (error instanceof UnauthenticatedError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AppError) {
    const status = error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : 400;
    return Response.json({ error: error.message }, { status });
  }
  console.error(error);
  return Response.json({ error: "The file could not be opened." }, { status: 500 });
}

function contentDisposition(inline: boolean, filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "file";
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: Request, context: { params: Promise<{ attachmentId: string }> }) {
  try {
    const ctx = await getActionAuthContext();
    const { attachmentId } = await context.params;
    const opened = await openAttachment(ctx, attachmentId);
    const forceDownload = new URL(request.url).searchParams.get("download") === "1";
    return new Response(opened.body, {
      headers: {
        "Content-Type": opened.contentType,
        "Content-Length": String(opened.sizeBytes),
        "Content-Disposition": contentDisposition(opened.inline && !forceDownload, opened.filename),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
