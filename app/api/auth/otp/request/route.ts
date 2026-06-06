import { NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { requestOtp } from "@/services/sqlite/db";
import { sendSms } from "@/services/sms/sendSms";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = requestOtp(String(body.phone ?? ""), String(body.purpose ?? "signup"));
    await sendSms({
      to: String(body.phone ?? ""),
      message: `[보팃] 인증번호는 ${result.code} 입니다.`
    });

    return NextResponse.json({
      verificationId: result.verificationId,
      expiresAt: result.expiresAt,
      devCode: process.env.NODE_ENV === "production" ? undefined : result.code
    });
  } catch (error) {
    return jsonError(error, 400);
  }
}

