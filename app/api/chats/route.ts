import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { createOrGetChatRoom, listChatRooms } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    return NextResponse.json(listChatRooms(user.id));
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    return NextResponse.json(createOrGetChatRoom(user.id, String(body.politicianId ?? "")));
  } catch (error) {
    return authError(error);
  }
}
