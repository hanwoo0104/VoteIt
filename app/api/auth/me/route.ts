import { NextResponse } from "next/server";
import { currentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json(user ? { user, accessToken: "local-session" } : { user: null, accessToken: null });
}
