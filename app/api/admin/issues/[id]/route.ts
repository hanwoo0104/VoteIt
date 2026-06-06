import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { deleteIssue } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    deleteIssue(id, user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authError(error);
  }
}

