import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizePhone } from "@/services/auth/phone";
import { sendSms } from "@/services/sms/sendSms";
import { getSupabaseAdminClient } from "@/services/supabase/server";

const OTP_TTL_MINUTES = 5;
const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET ?? "voteit-dev-otp-secret";

function hashOtp(phone: string, code: string) {
  return createHash("sha256").update(`${phone}.${code}.${OTP_HASH_SECRET}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { phone, purpose = "signup" } = (await request.json()) as { phone?: string; purpose?: string };
    const normalizedPhone = normalizePhone(phone ?? "");

    if (!/^01\d{8,9}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: "올바른 휴대폰 번호를 입력해 주세요." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

    const { data, error } = await supabase
      .from("phone_verifications")
      .insert({
        phone: normalizedPhone,
        purpose,
        code_hash: hashOtp(normalizedPhone, code),
        expires_at: expiresAt
      })
      .select("id, expires_at")
      .single();

    if (error) throw error;

    await sendSms({
      to: normalizedPhone,
      message: `[VoteIt] 인증번호는 ${code} 입니다. ${OTP_TTL_MINUTES}분 안에 입력해 주세요.`
    });

    return NextResponse.json({
      verificationId: data.id,
      expiresAt: data.expires_at,
      devCode: process.env.NODE_ENV === "production" ? undefined : code
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "인증번호 발송에 실패했습니다." },
      { status: 500 }
    );
  }
}
