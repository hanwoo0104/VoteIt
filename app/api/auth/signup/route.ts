import { NextResponse } from "next/server";
import { phoneToAuthEmail, normalizePhone } from "@/services/auth/phone";
import { getSupabaseAdminClient } from "@/services/supabase/server";
import type { AgeGroup, Gender, IncomeLevel } from "@/types";

interface SignupRequest {
  name: string;
  nickname: string;
  phone: string;
  password: string;
  gender: Gender;
  ageGroup: AgeGroup;
  region: string;
  incomeLevel: IncomeLevel;
  verificationId: string;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SignupRequest;
    const normalizedPhone = normalizePhone(payload.phone);

    if (!payload.verificationId) {
      return NextResponse.json({ error: "휴대폰 인증을 먼저 완료해 주세요." }, { status: 400 });
    }

    if (!payload.name || !payload.nickname || payload.password.length < 8) {
      return NextResponse.json({ error: "이름, 닉네임, 8자 이상 비밀번호가 필요합니다." }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: verification, error: verificationError } = await supabase
      .from("phone_verifications")
      .select("id, phone, verified_at, consumed_at, expires_at, purpose")
      .eq("id", payload.verificationId)
      .eq("phone", normalizedPhone)
      .single();

    if (verificationError || !verification) {
      return NextResponse.json({ error: "휴대폰 인증 정보를 찾을 수 없습니다." }, { status: 400 });
    }

    if (verification.purpose !== "signup" || verification.consumed_at || !verification.verified_at) {
      return NextResponse.json({ error: "유효하지 않은 휴대폰 인증입니다." }, { status: 400 });
    }

    if (new Date(verification.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "인증 시간이 만료되었습니다. 다시 인증해 주세요." }, { status: 400 });
    }

    const email = phoneToAuthEmail(normalizedPhone);
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        phone: normalizedPhone,
        name: payload.name,
        nickname: payload.nickname,
        role: "user",
        gender: payload.gender,
        age_group: payload.ageGroup,
        region: payload.region,
        income_level: payload.incomeLevel
      }
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    await supabase
      .from("phone_verifications")
      .update({
        consumed_at: new Date().toISOString(),
        user_id: created.user.id
      })
      .eq("id", verification.id);

    return NextResponse.json({ userId: created.user.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "회원가입에 실패했습니다." },
      { status: 500 }
    );
  }
}
