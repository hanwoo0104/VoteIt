"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Eye, MessageCircle, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { ShimmerLoader } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { DemographicCharts } from "@/components/charts/DemographicCharts";
import { CommentSection } from "@/features/comments/CommentSection";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { AnalysisPanel } from "@/features/issues/AnalysisPanel";
import { OptionCard } from "@/features/issues/OptionCard";
import { useIssueDetail } from "@/hooks/useIssues";
import { useAuthStore } from "@/stores/authStore";
import { formatNumber } from "@/lib/utils";

export function IssueDetail({ issueId }: { issueId: string }) {
  return (
    <RequireAuth>
      <IssueDetailContent issueId={issueId} />
    </RequireAuth>
  );
}

function IssueDetailContent({ issueId }: { issueId: string }) {
  const { issue, loading, error, reload, selectedOptionId, submitVote, voting } = useIssueDetail(issueId);
  const user = useAuthStore((state) => state.user);

  if (loading && !issue) {
    return (
      <AppShell showHeader={false} className="space-y-5 px-5 pt-[calc(16px+env(safe-area-inset-top))]">
        <ShimmerLoader text="현안 상세를 불러오는 중..." />
      </AppShell>
    );
  }

  if (error || !issue) {
    return (
      <AppShell>
        <ErrorState title="현안을 불러오지 못했습니다" description={error ?? "현안을 찾지 못했어요."} onRetry={reload} />
      </AppShell>
    );
  }

  const selectedOption = issue.options.find((option) => option.id === selectedOptionId);
  const selectedStats = selectedOption ? issue.statistics[selectedOption.id] : undefined;

  return (
    <AppShell showHeader={false} className="space-y-5 px-0">
      <div className="sticky top-0 z-30 bg-white/86 px-5 pb-3 pt-[calc(16px+env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="뒤로가기" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Badge className="bg-vote-red/10 text-vote-red">오늘 핫한 주제🔥</Badge>
          <div className="h-11 w-11" />
        </div>
      </div>

      <section className="px-5">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl bg-[#e4e4e4] p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[24px] font-black leading-tight text-black">{issue.title}</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{issue.summary}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <StatPill icon={UsersRound} label="참여" value={formatNumber(issue.participants)} />
            <StatPill icon={Eye} label="조회" value={formatNumber(issue.views)} />
            <StatPill icon={MessageCircle} label="댓글" value={formatNumber(issue.commentsCount)} />
          </div>

          <div className="mt-5 space-y-2">
            {issue.newsLinks.map((news) => (
              <a
                key={news.id}
                href={news.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-sm font-bold text-vote-ink"
              >
                <span className="min-w-0 truncate">
                  {news.outlet} · {news.title}
                </span>
                <ExternalLink className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
              </a>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="space-y-3 px-5">
        <div>
          <h2 className="text-xl font-black text-vote-ink">나의 의견은?</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">4개 의견 중 가장 가까운 관점을 선택해 주세요.</p>
        </div>

        <div className="space-y-3">
          {issue.options.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <OptionCard
                option={option}
                selected={selectedOptionId === option.id}
                disabled={!user || voting}
                onSelect={() => submitVote(option.id)}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {selectedOption ? (
        <div className="space-y-5 px-5">
          <AnalysisPanel issue={issue} option={selectedOption} />
          {selectedStats ? (
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-black text-vote-ink">선택한 사람들의 통계</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">실제 투표자의 익명화된 집계 통계입니다.</p>
              </div>
              <DemographicCharts statistics={selectedStats} />
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="px-5">
        <CommentSection issueId={issue.id} />
      </div>
    </AppShell>
  );
}

function StatPill({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/72 px-3 py-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-vote-blue" />
      <p className="mt-1 text-[11px] font-bold text-slate-500">{label}</p>
      <p className="text-sm font-black text-vote-ink">{value}</p>
    </div>
  );
}
