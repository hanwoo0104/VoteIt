import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { listPendingReports } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(listPendingReports(await requireCurrentUser()));
  } catch (error) {
    return authError(error);
  }
}

