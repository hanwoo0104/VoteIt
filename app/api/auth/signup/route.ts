import { NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { signUp } from "@/services/sqlite/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!payload.name || !payload.nickname || String(payload.password ?? "").length < 8) {
      return NextResponse.json({ error: "이름, 닉네임, 8자 이상 비밀번호가 필요합니다." }, { status: 400 });
    }

    const user = signUp(payload);
    return NextResponse.json({ userId: user.id });
  } catch (error) {
    return jsonError(error, 400);
  }
}

