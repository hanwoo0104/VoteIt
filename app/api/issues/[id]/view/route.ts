import { NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { recordIssueView } from "@/services/sqlite/db";
import { currentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const user = await currentUser();
    recordIssueView(id, user?.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, 400);
  }
}

