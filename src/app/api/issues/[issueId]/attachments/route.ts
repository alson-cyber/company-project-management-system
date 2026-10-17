import { addAttachment } from "@/modules/collaboration/collaboration.service";
import { attachmentLimitLabel } from "@/modules/collaboration/files";
import { getActionAuthContext } from "@/server/access/session";
import { getAttachmentPolicy } from "@/server/config";
import { AppError, UnauthenticatedError, ValidationError } from "@/server/errors";
import { consumeRateLimit, tooManyRequests } from "@/server/security/rate-limit";

export const runtime = "nodejs";

function errorResponse(error: unknown): Response {
  if (error instanceof UnauthenticatedError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AppError) {
    const status = error.code === "VALIDATION" ? 400 : error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : 409;
    return Response.json({ error: error.message }, { status });
  }
  console.error(error);
  return Response.json({ error: "The upload could not be saved." }, { status: 500 });
}

export async function POST(request: Request, context: { params: Promise<{ issueId: string }> }) {
  try {
    const ctx = await getActionAuthContext();
    const limit = consumeRateLimit(`upload:${ctx.userId}`, 30, 60_000);
    if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);
    const { issueId } = await context.params;
    const policy = getAttachmentPolicy();
    const declared = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > policy.maxBytes + 1024 * 1024) {
      throw new ValidationError(`Attachments must be ${attachmentLimitLabel(policy.maxBytes)} or smaller.`);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ValidationError("Choose a file to upload.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const saved = await addAttachment(ctx, {
      issueId,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      bytes,
    });
    return Response.json(saved);
  } catch (error) {
    return errorResponse(error);
  }
}
