"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, MessageSquareText, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requestSignupOtp, verifySignupOtp } from "@/services/auth/otp";
import { isSupabaseConfigured } from "@/services/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import type { AgeGroup, Gender, IncomeLevel } from "@/types";

const regions = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충청", "전라", "경상", "제주"];
const ageGroups: AgeGroup[] = ["10대", "20대", "30대", "40대", "50대", "60대 이상"];
const incomeLevels: IncomeLevel[] = ["200만원 미만", "200-400만원", "400-700만원", "700만원 이상"];

export function SignupForm() {
  const router = useRouter();
  const signup = useAuthStore((state) => state.signup);
  const loading = useAuthStore((state) => state.loading);
  const [step, setStep] = useState<"profile" | "otp">("profile");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [error, setError] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    phone: "",
    password: "",
    gender: "other" as Gender,
    ageGroup: "30대" as AgeGroup,
    region: "서울",
    incomeLevel: "200-400만원" as IncomeLevel
  });

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const requestOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!form.name || !form.nickname || !form.phone || form.password.length < 8) {
      setError("이름, 닉네임, 휴대폰 번호와 8자 이상 비밀번호를 입력해 주세요.");
      return;
    }
    const result = await requestSignupOtp(form.phone);
    setVerificationId(result.verificationId);
    setOtpVerified(false);
    setOtp("");
    setOtpHint(
      result.devCode
        ? `개발 환경 인증번호는 ${result.devCode} 입니다.`
        : `인증번호를 발송했습니다. ${new Date(result.expiresAt).toLocaleTimeString("ko-KR")}까지 입력해 주세요.`
    );
    setStep("otp");
  };

  const finish = async () => {
    setError("");
    const result = await verifySignupOtp(verificationId, otp);
    if (!result.verified) return;
    setOtpVerified(true);
    await signup({ ...form, verificationId: result.verificationId });
    router.push("/");
  };

  return (
    <AppShell showHeader={false} showBottomNav={false} className="px-5 py-8">
      <div className="mb-8">
        <Logo />
        <h1 className="mt-8 text-3xl font-black leading-tight text-vote-ink">의견을 더 정확히 비교하기 위한 기본 정보</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">통계는 익명화된 집계로만 사용됩니다. 인증번호는 DB에 만료 시간과 함께 저장되고, SMS 발송 어댑터만 교체하면 실제 문자로 전환됩니다.</p>
      </div>

      {!isSupabaseConfigured ? (
        <div className="mb-5 rounded-3xl border border-vote-red/10 bg-vote-red/10 p-4">
          <p className="text-sm font-black text-vote-ink">Supabase 환경변수가 필요해요</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            OTP와 회원가입은 실제 DB에 저장되므로 `.env.local` 설정 후 사용할 수 있습니다.
          </p>
        </div>
      ) : null}

      {step === "profile" ? (
        <motion.form initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} onSubmit={requestOtp} className="space-y-4 rounded-3xl bg-white p-5 shadow-soft">
          <Field label="이름">
            <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="홍길동" />
          </Field>
          <Field label="닉네임">
            <Input value={form.nickname} onChange={(event) => update("nickname", event.target.value)} placeholder="토론하는시민" />
          </Field>
          <Field label="휴대폰 번호">
            <Input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="010-0000-0000" />
          </Field>
          <Field label="비밀번호">
            <Input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="8자 이상" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="성별">
              <Select value={form.gender} onChange={(event) => update("gender", event.target.value)}>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="other">기타/응답 안 함</option>
              </Select>
            </Field>
            <Field label="연령대">
              <Select value={form.ageGroup} onChange={(event) => update("ageGroup", event.target.value)}>
                {ageGroups.map((age) => (
                  <option key={age}>{age}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="지역">
            <Select value={form.region} onChange={(event) => update("region", event.target.value)}>
              {regions.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </Select>
          </Field>
          <Field label="소득 수준">
            <Select value={form.incomeLevel} onChange={(event) => update("incomeLevel", event.target.value)}>
              {incomeLevels.map((income) => (
                <option key={income}>{income}</option>
              ))}
            </Select>
          </Field>
          {error ? <p className="text-sm font-semibold text-vote-red">{error}</p> : null}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={!isSupabaseConfigured}>
            <MessageSquareText className="h-5 w-5" />
            OTP 인증하기
          </Button>
        </motion.form>
      ) : (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black text-vote-ink">휴대폰 인증</p>
          <p className="text-sm font-medium text-slate-500">{otpHint}</p>
            </div>
          </div>
          <Input inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value)} className="text-center text-xl font-black tracking-[0.35em]" maxLength={6} />
          {error ? <p className="mt-3 text-sm font-semibold text-vote-red">{error}</p> : null}
          <Button variant="primary" size="lg" className="mt-5 w-full" onClick={finish} disabled={loading}>
            <CheckCircle2 className="h-5 w-5" />
            {loading ? "가입 중..." : otpVerified ? "인증 완료" : "인증 완료하고 시작"}
          </Button>
          <Button
            variant="soft"
            className="mt-2 w-full"
            onClick={async () => {
              const result = await requestSignupOtp(form.phone);
              setVerificationId(result.verificationId);
              setOtp("");
              setOtpHint(result.devCode ? `개발 환경 인증번호는 ${result.devCode} 입니다.` : "인증번호를 다시 발송했습니다.");
            }}
          >
            인증번호 재전송
          </Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep("profile")}>
            정보 수정
          </Button>
        </motion.div>
      )}

      <div className="mt-6 text-center text-sm font-semibold text-slate-500">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-black text-vote-red">
          로그인
        </Link>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-vote-ink">{label}</span>
      {children}
    </label>
  );
}
