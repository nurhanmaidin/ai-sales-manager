import { NextResponse, type NextRequest } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { rateLimit } from "@/lib/rate-limit";
import { searchService } from "@/lib/search/service";

export async function GET(request: NextRequest) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`search:${ctx.userId}`, 120, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  try {
    const results = await searchService.search(ctx, q);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("[search] failed", error);
    return NextResponse.json({ error: "Search is unavailable right now." }, { status: 500 });
  }
}
