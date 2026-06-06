import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { toggleCommentLike } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const body = await request.json();
    toggleCommentLike(id, user.id, Boolean(body.liked));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error);
  }
}

