"use client";

import Link from "next/link";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { initials } from "@/lib/utils";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setDemoRole = useAuthStore((state) => state.setDemoRole);

  return (
    <AppShell className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-vote-ink">마이페이지</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">세션, 역할, 내 투표 참여 정보를 확인합니다.</p>
      </div>

      {user ? (
        <section className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-navy-900 text-xl font-black text-white">
              {initials(user.nickname)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-xl font-black text-vote-ink">{user.nickname}</h2>
                <Badge className="bg-vote-blue/10 text-vote-blue">{roleLabel(user.role)}</Badge>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-500">{user.phone}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Info label="성별" value={genderLabel(user.gender)} />
            <Info label="연령대" value={user.ageGroup} />
            <Info label="지역" value={user.region} />
            <Info label="소득" value={user.incomeLevel} />
          </div>
          <div className="mt-5 flex gap-2">
            {user.role !== "admin" ? (
              <Button variant="soft" className="flex-1" onClick={() => setDemoRole("admin")}>
                <ShieldCheck className="h-5 w-5" />
                관리자 전환
              </Button>
            ) : (
              <Link href="/admin" className="flex-1">
                <Button variant="primary" className="w-full">
                  관리자 페이지
                </Button>
              </Link>
            )}
            <Button variant="outline" className="flex-1" onClick={() => logout()}>
              <LogOut className="h-5 w-5" />
              로그아웃
            </Button>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl bg-white p-5 text-center shadow-soft">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
            <UserRound className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-black text-vote-ink">로그인이 필요해요</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">가입하면 투표, 댓글, 정치인 채팅 기록이 내 계정에 저장됩니다.</p>
          <div className="mt-5 flex gap-2">
            <Link href="/login" className="flex-1">
              <Button variant="primary" className="w-full">
                로그인
              </Button>
            </Link>
            <Link href="/signup" className="flex-1">
              <Button variant="outline" className="w-full">
                회원가입
              </Button>
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-vote-ink p-5 text-white shadow-soft">
        <p className="text-sm font-black text-white/70">PWA 상태</p>
        <h2 className="mt-2 text-xl font-black">홈 화면 설치와 safe-area 대응 완료</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/70">하단 탭바는 모바일 브라우저와 설치형 PWA에서 모두 안전 영역을 피하도록 고정됩니다.</p>
      </section>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 truncate font-black text-vote-ink">{value}</p>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === "admin") return "관리자";
  if (role === "politician") return "정치인";
  return "일반 사용자";
}

function genderLabel(gender: string) {
  if (gender === "female") return "여성";
  if (gender === "male") return "남성";
  return "기타/응답 안 함";
}
