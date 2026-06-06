import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { listIssues } from "@/services/sqlite/db";
import { currentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const user = await currentUser();
    const includeUnpublished = url.searchParams.get("admin") === "1" && user?.role === "admin";
    return NextResponse.json(listIssues({ includeUnpublished }));
  } catch (error) {
    return authError(error);
  }
}

