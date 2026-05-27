import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/services/supabase/server";

const MAX_ATTEMPTS = 5;
const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET ?? "voteit-dev-otp-secret";

function hashOtp(phone: string, code: string) {
  return createHash("sha256").update(`${phone}.${code}.${OTP_HASH_SECRET}`).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { verificationId, code } = (await request.json()) as {
      verificationId?: string;
      code?: string;
    };

    if (!verificationId || !code) {
      return NextResponse.json({ error: "인증번호를 입력해 주세요." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: verification, error } = await supabase
      .from("phone_verifications")
      .select("id, phone, code_hash, expires_at, attempts, verified_at, consumed_at")
      .eq("id", verificationId)
      .single();

    if (error || !verification) {
      return NextResponse.json({ error: "인증 요청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (verification.consumed_at) {
      return NextResponse.json({ error: "이미 사용된 인증번호입니다." }, { status: 400 });
    }

    if (verification.verified_at) {
      return NextResponse.json({ verificationId: verification.id, verified: true });
    }

    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "인증번호가 만료되었습니다. 다시 요청해 주세요." }, { status: 400 });
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: "인증 시도 횟수를 초과했습니다. 다시 요청해 주세요." }, { status: 429 });
    }

    const matched = verification.code_hash === hashOtp(verification.phone, code.trim());

    if (!matched) {
      await supabase
        .from("phone_verifications")
        .update({ attempts: verification.attempts + 1 })
        .eq("id", verification.id);
      return NextResponse.json({ error: "인증번호가 일치하지 않습니다." }, { status: 400 });
    }

    await supabase
      .from("phone_verifications")
      .update({ verified_at: new Date().toISOString(), attempts: verification.attempts + 1 })
      .eq("id", verification.id);

    return NextResponse.json({ verificationId: verification.id, verified: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "인증번호 검증에 실패했습니다." },
      { status: 500 }
    );
  }
}
