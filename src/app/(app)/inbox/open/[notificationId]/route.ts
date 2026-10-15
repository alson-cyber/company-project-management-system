import { NextResponse, type NextRequest } from "next/server";
import { notificationDestination } from "@/modules/attention/attention.queries";
import { getActionAuthContext } from "@/server/access/session";
import { NotFoundError, UnauthenticatedError } from "@/server/errors";

export async function GET(request: NextRequest, context: { params: Promise<{ notificationId: string }> }) {
  const { notificationId } = await context.params;
  try {
    const ctx = await getActionAuthContext();
    const destination = await notificationDestination(ctx, notificationId);
    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    if (error instanceof UnauthenticatedError) return NextResponse.redirect(new URL("/login", request.url));
    if (error instanceof NotFoundError) return NextResponse.redirect(new URL("/inbox", request.url));
    throw error;
  }
}
