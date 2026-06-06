"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAdminIssues, fetchIssueBySlug, fetchIssues, fetchMyVoteStatus, recordIssueView, voteIssue } from "@/services/issues/issueService";
import { useAsync } from "@/hooks/useAsync";
import { useAuthStore } from "@/stores/authStore";
import type { Issue } from "@/types";

export function useIssues(options: { admin?: boolean } = {}) {
  return useAsync(options.admin ? fetchAdminIssues : fetchIssues, [options.admin], { label: "현안 목록" });
}

export function useIssueDetail(slug: string) {
  const user = useAuthStore((state) => state.user);
  const asyncState = useAsync(() => fetchIssueBySlug(slug), [slug], { label: "현안 상세" });
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [voteCanceled, setVoteCanceled] = useState(false);
  const [voting, setVoting] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!asyncState.data) return;
    const viewKey = `voteit-viewed:${asyncState.data.id}`;
    if (window.sessionStorage.getItem(viewKey) === "true") return;
    window.sessionStorage.setItem(viewKey, "true");
    recordIssueView(asyncState.data.id).catch(() => undefined);
  }, [asyncState.data?.id]);

  useEffect(() => {
    if (!asyncState.data) return;
    let active = true;
    fetchMyVoteStatus(asyncState.data.id)
      .then((status) => {
        if (!active || !mountedRef.current) return;
        setSelectedOptionId(status.optionId);
        setVoteCanceled(status.canceled);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [asyncState.data?.id, user?.id]);

  useEffect(() => {
    if (!asyncState.data) return;
    const timer = window.setInterval(() => asyncState.reload({ silent: true }), 3500);
    return () => window.clearInterval(timer);
  }, [asyncState.data?.id, asyncState.reload]);

  const submitVote = async (optionId: string) => {
    if (!asyncState.data || !user) throw new Error("로그인이 필요합니다.");
    if (voteCanceled) throw new Error("선택을 취소한 현안에는 다시 투표할 수 없습니다.");
    if (selectedOptionId && selectedOptionId !== optionId) {
      throw new Error("이미 선택한 의견은 다른 의견으로 변경할 수 없습니다.");
    }

    setVoting(true);
    const previous = selectedOptionId;
    setSelectedOptionId(optionId);

    try {
      await voteIssue(asyncState.data.id, optionId);
      await asyncState.reload({ silent: true });
    } catch (error) {
      if (mountedRef.current) setSelectedOptionId(previous);
      throw error;
    } finally {
      if (mountedRef.current) setVoting(false);
    }
  };

  return {
    ...asyncState,
    issue: asyncState.data as Issue | null,
    selectedOptionId,
    voteCanceled,
    voting,
    submitVote
  };
}

export async function assertDatabaseReady() {
  return true;
}
