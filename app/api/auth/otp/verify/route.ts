import { NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { verifyOtp } from "@/services/sqlite/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(verifyOtp(String(body.verificationId ?? ""), String(body.code ?? "")));
  } catch (error) {
    return jsonError(error, 400);
  }
}

