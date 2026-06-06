import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { deleteComment, updateComment } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";
import { containsProfanity, sanitizeComment } from "@/services/moderation/profanity";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const body = await request.json();
    const text = String(body.body ?? "");
    if (containsProfanity(text)) {
      return NextResponse.json({ error: "서로 다른 의견을 이해할 수 있도록 표현을 조금만 부드럽게 바꿔 주세요." }, { status: 400 });
    }
    updateComment(id, sanitizeComment(text), user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    deleteComment(id, user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error);
  }
}

