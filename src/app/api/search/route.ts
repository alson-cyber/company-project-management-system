import { searchWorkspace } from "@/modules/attention/search.queries";
import { getActionAuthContext } from "@/server/access/session";
import { UnauthenticatedError } from "@/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await getActionAuthContext();
    const query = new URL(request.url).searchParams.get("q") ?? "";
    const results = await searchWorkspace(ctx, query);
    return Response.json(results);
  } catch (error) {
    if (error instanceof UnauthenticatedError) return Response.json({ error: "Sign in required." }, { status: 401 });
    return Response.json({ error: "Search is unavailable." }, { status: 500 });
  }
}
