import { NextResponse } from "next/server";
import { authError, jsonError } from "@/app/api/_utils";
import { createComment, listComments } from "@/services/sqlite/db";
import { currentUser, requireCurrentUser } from "@/services/sqlite/session";
import { containsProfanity, sanitizeComment } from "@/services/moderation/profanity";
import type { CommentSort } from "@/types";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const user = await currentUser();
    const sort = (url.searchParams.get("sort") === "likes" ? "likes" : "latest") satisfies CommentSort;
    return NextResponse.json(listComments(id, sort, user?.id));
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const body = await request.json();
    const text = String(body.body ?? "");
    if (containsProfanity(text)) {
      return NextResponse.json({ error: "서로 다른 의견을 이해할 수 있도록 표현을 조금만 부드럽게 바꿔 주세요." }, { status: 400 });
    }
    createComment(id, sanitizeComment(text), user.id, body.parentId ? String(body.parentId) : undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error);
  }
}

