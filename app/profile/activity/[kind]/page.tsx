"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, Reply, Vote, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ShimmerLoader } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { cancelIssueVote } from "@/services/issues/issueService";
import {
  fetchMyActivity,
  type MyActivitySummary,
  type MyCommentActivity,
  type MyLikedCommentActivity,
  type MyVoteActivity
} from "@/services/profile/activityService";
import { relativeTime } from "@/lib/utils";

type ActivityKind = "votes" | "comments" | "likes" | "replies";

const activityMeta: Record<ActivityKind, { title: string; description: string; icon: LucideIcon }> = {
  votes: { title: "내가 선택한 의견", description: "마지막으로 선택한 순서대로 정리했습니다.", icon: Vote },
  comments: { title: "내가 단 댓글", description: "현안에 직접 남긴 댓글 기록입니다.", icon: MessageCircle },
  likes: { title: "하트 누른 댓글", description: "공감 표시한 댓글을 모았습니다.", icon: Heart },
  replies: { title: "내가 단 답글", description: "원댓글에 남긴 답글 기록입니다.", icon: Reply }
};

const activityTabs = Object.entries(activityMeta) as Array<[ActivityKind, (typeof activityMeta)[ActivityKind]]>;

export default function ProfileActivityPage() {
  return (
    <RequireAuth>
      <ProfileActivityContent />
    </RequireAuth>
  );
}

function ProfileActivityContent() {
  const params = useParams<{ kind: string }>();
  const kind = normalizeKind(params.kind);
  const meta = activityMeta[kind];
  const Icon = meta.icon;
  const [activity, setActivity] = useState<MyActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelingVoteId, setCancelingVoteId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setActivity(await fetchMyActivity());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "활동 기록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    if (!activity) return [];
    if (kind === "votes") return activity.votes;
    if (kind === "comments") return activity.comments;
    if (kind === "likes") return activity.likedComments;
    return activity.replies;
  }, [activity, kind]);

  const cancelVote = async (issueId: string) => {
    setCancelingVoteId(issueId);
    setError("");
    try {
      await cancelIssueVote(issueId);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "선택취소에 실패했습니다.");
    } finally {
      setCancelingVoteId("");
    }
  };

  return (
    <AppShell showHeader={false} className="space-y-5 px-0">
      <div className="sticky top-0 z-30 bg-white/90 px-5 pb-3 pt-[calc(16px+env(safe-area-inset-top))] backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <Link href="/profile" aria-label="마이페이지로 돌아가기" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
            <ArrowLeft className="h-5 w-5 text-vote-ink" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-vote-red" />
              <h1 className="truncate text-2xl font-black text-vote-ink">{meta.title}</h1>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">{meta.description}</p>
          </div>
        </div>

        <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {activityTabs.map(([tabKind, tab]) => {
            const active = tabKind === kind;
            return (
              <Link
                key={tabKind}
                href={`/profile/activity/${tabKind}`}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${
                  active ? "bg-vote-blue text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.title}
              </Link>
            );
          })}
        </div>
      </div>

      <section className="px-5">
        {loading ? <ShimmerLoader text="활동 기록을 불러오는 중..." /> : null}
        {error ? <ErrorState description={error} onRetry={load} /> : null}
        {!loading && !error && activity ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {items.length === 0 ? (
              <EmptyState title="아직 기록이 없습니다" description="참여 기록이 생기면 이곳에 시간순으로 모입니다." />
            ) : null}
            {kind === "votes"
              ? (items as MyVoteActivity[]).map((item) => (
                  <VoteActivityCard key={`${item.issueId}-${item.createdAt}`} item={item} canceling={cancelingVoteId === item.issueId} onCancel={cancelVote} />
                ))
              : null}
            {kind === "comments" || kind === "replies"
              ? (items as MyCommentActivity[]).map((item) => <CommentActivityCard key={item.id} item={item} />)
              : null}
            {kind === "likes" ? (items as MyLikedCommentActivity[]).map((item) => <LikedCommentActivityCard key={`${item.id}-${item.likedAt}`} item={item} />) : null}
          </motion.div>
        ) : null}
      </section>
    </AppShell>
  );
}

function normalizeKind(kind: string | string[] | undefined): ActivityKind {
  const value = Array.isArray(kind) ? kind[0] : kind;
  return value === "votes" || value === "comments" || value === "likes" || value === "replies" ? value : "votes";
}

function VoteActivityCard({
  item,
  canceling,
  onCancel
}: {
  item: MyVoteActivity;
  canceling: boolean;
  onCancel: (issueId: string) => void;
}) {
  return (
    <article className="rounded-3xl bg-white p-4 shadow-soft">
      <Link href={`/issues/${item.issueSlug}`} className="block">
        <p className="line-clamp-1 text-sm font-black text-vote-ink">{item.issueTitle}</p>
        <p className="mt-2 text-base font-black text-vote-blue">{item.optionTitle}</p>
        {item.optionText ? <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-500">{item.optionText}</p> : null}
        <p className="mt-3 text-[11px] font-semibold text-slate-400">{relativeTime(item.createdAt)}</p>
      </Link>
      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => onCancel(item.issueId)} disabled={canceling}>
        {canceling ? "취소 중..." : "선택취소"}
      </Button>
    </article>
  );
}

function CommentActivityCard({ item }: { item: MyCommentActivity }) {
  return (
    <Link href={`/issues/${item.issueSlug}`} className="block rounded-3xl bg-white p-4 shadow-soft">
      <p className="line-clamp-1 text-sm font-black text-vote-ink">{item.issueTitle}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{item.body}</p>
      <p className="mt-3 text-[11px] font-semibold text-slate-400">{relativeTime(item.createdAt)}</p>
    </Link>
  );
}

function LikedCommentActivityCard({ item }: { item: MyLikedCommentActivity }) {
  return (
    <Link href={`/issues/${item.issueSlug}`} className="block rounded-3xl bg-white p-4 shadow-soft">
      <p className="line-clamp-1 text-sm font-black text-vote-ink">{item.issueTitle}</p>
      <p className="mt-2 text-xs font-black text-slate-400">{item.authorNickname}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{item.body}</p>
      <p className="mt-3 text-[11px] font-semibold text-slate-400">{relativeTime(item.likedAt)}</p>
    </Link>
  );
}
