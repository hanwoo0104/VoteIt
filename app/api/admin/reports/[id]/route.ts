import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { resolveReport } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const body = await request.json();
    resolveReport(id, body.status === "dismissed" ? "dismissed" : "resolved", user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error);
  }
}

