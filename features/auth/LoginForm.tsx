"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockKeyhole, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import { isSupabaseConfigured } from "@/services/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await login({ phone, password });
    router.push("/");
  };

  return (
    <AppShell showHeader={false} showBottomNav={false} className="flex min-h-dvh flex-col justify-center px-5 py-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-7">
        <div>
          <Logo />
          <h1 className="mt-8 text-3xl font-black leading-tight text-vote-ink">다른 의견까지 보이는 정치 커뮤니티</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">휴대폰 인증을 완료한 계정으로 로그인하면 Supabase JWT 세션이 유지됩니다.</p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="rounded-3xl border border-vote-red/10 bg-vote-red/10 p-4">
            <p className="text-sm font-black text-vote-ink">Supabase 연결이 필요해요</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              현재 버전은 실제 DB 로그인만 지원합니다. 이전 데모 계정은 제거되었고, `.env.local`에 Supabase 값을 넣은 뒤
              회원가입으로 계정을 만들어야 합니다.
            </p>
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-3 rounded-3xl bg-white p-5 shadow-soft">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-black text-vote-ink">
              <Phone className="h-4 w-4 text-vote-blue" />
              휴대폰 번호
            </span>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-0000-0000" />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-black text-vote-ink">
              <LockKeyhole className="h-4 w-4 text-vote-blue" />
              비밀번호
            </span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <p className="text-sm font-semibold text-vote-red">{error}</p> : null}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading || !isSupabaseConfigured}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <div className="text-center text-sm font-semibold text-slate-500">
          아직 계정이 없나요?{" "}
          <Link href="/signup" className="font-black text-vote-red">
            회원가입
          </Link>
        </div>
      </motion.div>
    </AppShell>
  );
}
