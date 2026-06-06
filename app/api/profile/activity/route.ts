import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { getMyActivity } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json(getMyActivity(user.id));
  } catch (error) {
    return authError(error);
  }
}
