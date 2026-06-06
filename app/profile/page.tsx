"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Heart, LogOut, MessageCircle, Reply, ShieldCheck, UserRound, Vote } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { ShimmerLoader } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useAuthStore } from "@/stores/authStore";
import { initials, relativeTime } from "@/lib/utils";
import {
  fetchMyActivity,
  type MyActivitySummary,
  type MyCommentActivity,
  type MyLikedCommentActivity,
  type MyVoteActivity
} from "@/services/profile/activityService";
import { cancelIssueVote } from "@/services/issues/issueService";

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
  const [activityOpen, setActivityOpen] = useState(false);
  const [activity, setActivity] = useState<MyActivitySummary | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [cancelingVoteId, setCancelingVoteId] = useState("");
  const [activityError, setActivityError] = useState("");

  const loadActivity = useCallback(async () => {
    if (!user) return;
    setLoadingActivity(true);
    setActivityError("");
    try {
      setActivity(await fetchMyActivity(user.id));
    } catch (caught) {
      setActivityError(caught instanceof Error ? caught.message : "내 활동을 불러오지 못했습니다.");
    } finally {
      setLoadingActivity(false);
    }
  }, [user]);

  useEffect(() => {
    if (activityOpen && !activity && !loadingActivity) {
      loadActivity();
    }
  }, [activityOpen, activity, loadingActivity, loadActivity]);

  const cancelVote = async (issueId: string) => {
    setCancelingVoteId(issueId);
    setActivityError("");
    try {
      await cancelIssueVote(issueId);
      await loadActivity();
    } catch (caught) {
      setActivityError(caught instanceof Error ? caught.message : "선택취소에 실패했습니다.");
    } finally {
      setCancelingVoteId("");
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
            <ProfileAvatar nickname={user.nickname} avatarUrl={user.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-400">프로필</p>
              <h2 className="mt-1 truncate text-2xl font-black text-vote-ink">{user.nickname}</h2>
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
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 p-5 text-left transition active:scale-[0.99]"
          onClick={() => setActivityOpen((value) => !value)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vote-blue/10 text-vote-blue">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-vote-ink">내 활동 보기</h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">투표, 댓글, 공감, 답글 기록</p>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition ${activityOpen ? "rotate-180" : ""}`} />
        </button>

        {activityOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="border-t border-slate-100 px-5 pb-5"
          >
            {loadingActivity ? <ShimmerLoader text="내 활동을 불러오는 중..." /> : null}
            {activityError ? <ErrorState description={activityError} onRetry={loadActivity} /> : null}
            {activity ? <ActivitySummary activity={activity} cancelingVoteId={cancelingVoteId} onCancelVote={cancelVote} /> : null}
          </motion.div>
        ) : null}
      </section>
    </AppShell>
  );
}

function ProfileAvatar({ nickname, avatarUrl }: { nickname: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <div
        aria-label={`${nickname} 프로필 이미지`}
        className="h-20 w-20 shrink-0 rounded-[28px] bg-cover bg-center shadow-soft"
        style={{ backgroundImage: `url(${avatarUrl})` }}
      />
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] bg-navy-900 text-2xl font-black text-white shadow-soft">
      {initials(nickname)}
    </div>
  );
}

function ActivitySummary({
  activity,
  cancelingVoteId,
  onCancelVote
}: {
  activity: MyActivitySummary;
  cancelingVoteId: string;
  onCancelVote: (issueId: string) => void;
}) {
  const empty =
    activity.votes.length === 0 &&
    activity.comments.length === 0 &&
    activity.likedComments.length === 0 &&
    activity.replies.length === 0;

  if (empty) {
    return (
      <div className="rounded-3xl bg-slate-50 p-5 text-center">
        <p className="text-sm font-black text-vote-ink">아직 활동 기록이 없습니다</p>
        <p className="mt-1 text-xs font-medium text-slate-400">현안에 의견을 남기면 이곳에 모입니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-5">
      <VoteActivityList items={activity.votes} cancelingVoteId={cancelingVoteId} onCancelVote={onCancelVote} />
      <CommentActivityList title="내가 단 댓글" icon={MessageCircle} items={activity.comments} />
      <LikedCommentActivityList items={activity.likedComments} />
      <CommentActivityList title="내가 단 답글" icon={Reply} items={activity.replies} />
    </div>
  );
}

function VoteActivityList({
  items,
  cancelingVoteId,
  onCancelVote
}: {
  items: MyVoteActivity[];
  cancelingVoteId: string;
  onCancelVote: (issueId: string) => void;
}) {
  return (
    <ActivityBlock title="내가 선택한 의견" icon={Vote} count={items.length}>
      {items.map((item) => (
        <div key={`${item.issueId}-${item.optionTitle}`} className="rounded-2xl bg-slate-50 p-4">
          <Link href={`/issues/${item.issueSlug}`} className="block">
            <p className="line-clamp-1 text-sm font-black text-vote-ink">{item.issueTitle}</p>
            <p className="mt-2 text-sm font-bold text-vote-blue">{item.optionTitle}</p>
            {item.optionText ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{item.optionText}</p> : null}
            <p className="mt-2 text-[11px] font-semibold text-slate-400">{relativeTime(item.createdAt)}</p>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => onCancelVote(item.issueId)}
            disabled={cancelingVoteId === item.issueId}
          >
            {cancelingVoteId === item.issueId ? "취소 중..." : "선택취소"}
          </Button>
        </div>
      ))}
    </ActivityBlock>
  );
}

function CommentActivityList({
  title,
  icon,
  items
}: {
  title: string;
  icon: typeof MessageCircle;
  items: MyCommentActivity[];
}) {
  return (
    <ActivityBlock title={title} icon={icon} count={items.length}>
      {items.map((item) => (
        <Link key={item.id} href={`/issues/${item.issueSlug}`} className="block rounded-2xl bg-slate-50 p-4">
          <p className="line-clamp-1 text-sm font-black text-vote-ink">{item.issueTitle}</p>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
          <p className="mt-2 text-[11px] font-semibold text-slate-400">{relativeTime(item.createdAt)}</p>
        </Link>
      ))}
    </ActivityBlock>
  );
}

function LikedCommentActivityList({ items }: { items: MyLikedCommentActivity[] }) {
  return (
    <ActivityBlock title="하트 누른 댓글" icon={Heart} count={items.length}>
      {items.map((item) => (
        <Link key={item.id} href={`/issues/${item.issueSlug}`} className="block rounded-2xl bg-slate-50 p-4">
          <p className="line-clamp-1 text-sm font-black text-vote-ink">{item.issueTitle}</p>
          <p className="mt-2 text-xs font-black text-slate-400">{item.authorNickname}</p>
          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
          <p className="mt-2 text-[11px] font-semibold text-slate-400">{relativeTime(item.likedAt)}</p>
        </Link>
      ))}
    </ActivityBlock>
  );
}

function ActivityBlock({
  title,
  icon: Icon,
  count,
  children
}: {
  title: string;
  icon: typeof Vote;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-vote-red" />
          <h3 className="text-sm font-black text-vote-ink">{title}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">{count}</span>
      </div>
      {count > 0 ? <div className="space-y-2">{children}</div> : <EmptyActivity />}
    </div>
  );
}

function EmptyActivity() {
  return <p className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-400">아직 기록이 없습니다.</p>;
}
