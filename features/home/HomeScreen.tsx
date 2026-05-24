"use client";

import Link from "next/link";
import { ArrowRight, Eye, MessageCircle, Sparkles, UsersRound, Vote } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getHotIssue, issues } from "@/services/data/mockData";
import { useAuthStore } from "@/stores/authStore";
import { formatNumber } from "@/lib/utils";

export function HomeScreen() {
  const hotIssue = getHotIssue();
  const user = useAuthStore((state) => state.user);

  return (
    <AppShell className="space-y-5">
      {!user ? <AuthNudge /> : null}

      <motion.section
        whileTap={{ scale: 0.99 }}
        className="relative overflow-hidden rounded-2xl bg-[#e4e4e4] p-4 shadow-sm"
      >
        <Link href={`/issues/${hotIssue.id}`} className="absolute inset-0 z-10" aria-label="핫한 주제 상세보기" />
        <div className="relative z-0">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-[19px] font-black text-black">오늘 핫한 주제🔥</h1>
            <ReactionBurst />
          </div>
          <p className="mx-auto max-w-[300px] text-center text-[21px] font-medium leading-tight text-black">
            {hotIssue.title.replace("대통령의", "李 대통령의")}
          </p>

          <div className="mt-8 space-y-3">
            {hotIssue.options.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * index, type: "spring", stiffness: 260, damping: 24 }}
                className="rounded-lg px-4 py-3 text-center text-[13px] font-medium leading-snug text-white shadow-sm"
                style={{ background: option.gradient }}
              >
                {option.shortText}
              </motion.div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-end text-xs font-medium text-slate-500">
            자세히 알아보기 <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-2 gap-5">
        <HomeActionCard href="/discussions" label="더 많은 안건" strong="투표하러 가기" icon={Vote} />
        <HomeActionCard href="/chat" label="정치인과 직접" strong="소통하러 가기" icon={MessageCircle} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-vote-ink">실시간 인기 안건</h2>
          <Badge className="bg-vote-red/10 text-vote-red">LIVE</Badge>
        </div>
        {issues.slice(0, 4).map((issue, index) => (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <Link href={`/issues/${issue.id}`} className="block rounded-3xl bg-white p-4 shadow-soft transition active:scale-[0.99]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-vote-ink">{issue.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{issue.summary}</p>
                </div>
                <div className="rounded-2xl bg-slate-100 px-2.5 py-1 text-xs font-black text-vote-blue">
                  {issue.options[0].percent}%
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold text-slate-400">
                <span className="flex items-center gap-1">
                  <UsersRound className="h-3.5 w-3.5" />
                  {formatNumber(issue.participants)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {formatNumber(issue.views)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {formatNumber(issue.commentsCount)}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>
    </AppShell>
  );
}

function AuthNudge() {
  return (
    <div className="rounded-3xl border border-vote-blue/10 bg-white p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-vote-blue text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-vote-ink">의견 선택은 회원가입 후 가능해요</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">데모 계정으로 바로 들어가거나 OTP 가입 흐름을 확인할 수 있습니다.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/login" className="flex-1">
              <Button size="sm" variant="primary" className="w-full">
                로그인
              </Button>
            </Link>
            <Link href="/signup" className="flex-1">
              <Button size="sm" variant="outline" className="w-full">
                회원가입
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeActionCard({
  href,
  label,
  strong,
  icon: Icon
}: {
  href: string;
  label: string;
  strong: string;
  icon: typeof Vote;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="relative flex aspect-[0.9] flex-col justify-end overflow-hidden rounded-lg bg-[#284d73] p-5 text-white shadow-soft"
      >
        <Icon className="absolute right-4 top-4 h-7 w-7 opacity-20" />
        <div className="relative z-10 flex items-end justify-between gap-3">
          <div className="text-[15px] leading-tight">
            <p className="text-white/80">{label}</p>
            <p className="font-black">{strong}</p>
          </div>
          <ArrowRight className="h-9 w-9 stroke-[4]" />
        </div>
      </motion.div>
    </Link>
  );
}

function ReactionBurst() {
  const reactions = ["찬", "반", "중", "토"];
  return (
    <div className="relative h-8 w-20">
      {reactions.map((reaction, index) => (
        <span
          key={reaction}
          className="absolute bottom-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white shadow-sm"
          style={{
            left: `${index * 15}px`,
            background: index % 2 === 0 ? "#4169e1" : "#e4233f",
            animation: `floatUp 1.9s ease-in-out ${index * 0.22}s infinite`
          }}
        >
          {reaction}
        </span>
      ))}
    </div>
  );
}
