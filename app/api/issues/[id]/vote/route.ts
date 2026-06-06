import { NextResponse } from "next/server";
import { authError, jsonError } from "@/app/api/_utils";
import { cancelIssueVote, getMyVoteStatus, voteIssue } from "@/services/sqlite/db";
import { currentUser, requireCurrentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await currentUser();
    return NextResponse.json(getMyVoteStatus(id, user?.id));
  } catch (error) {
    return jsonError(error, 400);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const body = await request.json();
    voteIssue(id, String(body.optionId ?? ""), user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    cancelIssueVote(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error);
  }
}
