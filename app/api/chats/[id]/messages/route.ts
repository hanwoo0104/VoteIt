import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { listMessages, sendMessage } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    return NextResponse.json(listMessages(id, user));
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const body = await request.json();
    return NextResponse.json(sendMessage(id, user, String(body.body ?? "")));
  } catch (error) {
    return authError(error);
  }
}
