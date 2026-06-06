import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { upsertIssue } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    return NextResponse.json(upsertIssue(body, user));
  } catch (error) {
    return authError(error);
  }
}

