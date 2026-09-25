import { NextResponse } from "next/server";
import { format } from "date-fns";
import { getTenantContext } from "@/lib/auth/context";
import { EXPORTABLE, exportCsv, type ExportEntity } from "@/lib/export/service";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(_request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entity } = await params;
  if (!(EXPORTABLE as readonly string[]).includes(entity)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!rateLimit(`export:${ctx.userId}`, 20, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const csv = await exportCsv(ctx, entity as ExportEntity);
    return new NextResponse(`﻿${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${entity}-${format(new Date(), "yyyy-MM-dd")}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[export] failed", error);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }
}
