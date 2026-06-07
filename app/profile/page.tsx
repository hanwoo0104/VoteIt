"use client";

import Link from "next/link";
import { Camera, ChevronRight, Heart, LogOut, MessageCircle, Reply, ShieldCheck, UserRound, Vote } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useAuthStore } from "@/stores/authStore";
import { initials } from "@/lib/utils";
import { uploadMyAvatar } from "@/services/profile/profileService";
import { useState } from "react";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}

function ProfileContent() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const setAuth = useAuthStore((state) => state.setAuth);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const displayName = user?.role === "politician" ? user.name : user?.nickname;

  const changeAvatar = async (file?: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarError("");
    try {
      const updatedUser = await uploadMyAvatar(file);
      setAuth(updatedUser, accessToken);
    } catch (caught) {
      setAvatarError(caught instanceof Error ? caught.message : "프로필 사진 변경에 실패했습니다.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <AppShell className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-vote-ink">마이페이지</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">내 프로필과 참여 기록을 확인합니다.</p>
      </div>

      {user ? (
        <section className="rounded-3xl bg-white p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <ProfileAvatar name={displayName ?? user.nickname} avatarUrl={user.avatarUrl} uploading={uploadingAvatar} onChange={changeAvatar} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-400">프로필</p>
              <h2 className="mt-1 truncate text-2xl font-black text-vote-ink">{displayName}</h2>
              {avatarError ? <p className="mt-2 text-xs font-bold text-vote-red">{avatarError}</p> : null}
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            {user.role === "admin" ? (
              <Link href="/admin" className="flex-1">
                <Button variant="primary" className="w-full">
                  <ShieldCheck className="h-5 w-5" />
                  관리자 페이지
                </Button>
              </Link>
            ) : null}
            <Button variant="outline" className="flex-1" onClick={() => logout()}>
              <LogOut className="h-5 w-5" />
              로그아웃
            </Button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl bg-white shadow-soft">
        <div className="flex items-center gap-3 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vote-blue/10 text-vote-blue">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-vote-ink">내 활동 보기</h2>
            <p className="mt-1 text-xs font-semibold text-slate-400">카테고리별 전체 기록을 확인합니다.</p>
          </div>
        </div>
        <div className="border-t border-slate-100 px-3 pb-3">
          <ActivityMenuItem href="/profile/activity/votes" icon={Vote} title="내가 선택한 의견" description="마지막으로 선택한 순서대로 보기" />
          <ActivityMenuItem href="/profile/activity/comments" icon={MessageCircle} title="내가 단 댓글" description="현안별 댓글 기록 보기" />
          <ActivityMenuItem href="/profile/activity/likes" icon={Heart} title="하트 누른 댓글" description="공감한 댓글 모아보기" />
          <ActivityMenuItem href="/profile/activity/replies" icon={Reply} title="내가 단 답글" description="원댓글에 남긴 답글 보기" />
        </div>
      </section>
    </AppShell>
  );
}

function ProfileAvatar({
  name,
  avatarUrl,
  uploading,
  onChange
}: {
  name: string;
  avatarUrl?: string;
  uploading: boolean;
  onChange: (file?: File | null) => void;
}) {
  if (avatarUrl) {
    return (
      <label className="group relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-[28px] bg-cover bg-center shadow-soft" style={{ backgroundImage: `url(${avatarUrl})` }}>
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
          <Camera className="h-5 w-5" />
        </span>
        <span className="sr-only">{name} 프로필 사진 변경</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={uploading} onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
      </label>
    );
  }

  return (
    <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-[28px] bg-navy-900 text-2xl font-black text-white shadow-soft">
      {initials(name)}
      <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-vote-blue shadow-soft">
        <Camera className="h-4 w-4" />
      </span>
      <span className="sr-only">{name} 프로필 사진 변경</span>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={uploading} onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
    </label>
  );
}

function ActivityMenuItem({
  href,
  icon: Icon,
  title,
  description
}: {
  href: string;
  icon: typeof Vote;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl px-2 py-3 transition active:scale-[0.99]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-vote-red">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-vote-ink">{title}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-400">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-300" />
    </Link>
  );
}
