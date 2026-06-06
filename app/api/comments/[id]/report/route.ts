import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { reportComment } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    reportComment(id, user.id, String(body.reason ?? "user_report"));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error);
  }
}
