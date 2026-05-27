"use client";

import { useEffect, useRef, useState } from "react";
import { fetchIssueBySlug, fetchIssues, fetchMyVote, recordIssueView, voteIssue } from "@/services/issues/issueService";
import { getSupabaseClient, supabase } from "@/services/supabase/client";
import { useAsync } from "@/hooks/useAsync";
import { useAuthStore } from "@/stores/authStore";
import type { Issue } from "@/types";

export function useIssues() {
  return useAsync(fetchIssues, [], { label: "현안 목록" });
}

export function useIssueDetail(slug: string) {
  const user = useAuthStore((state) => state.user);
  const asyncState = useAsync(() => fetchIssueBySlug(slug), [slug], { label: "현안 상세" });
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
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
    recordIssueView(asyncState.data.id, user?.id).catch(() => undefined);
  }, [asyncState.data?.id, user?.id]);

  useEffect(() => {
    if (!asyncState.data) return;
    let active = true;
    fetchMyVote(asyncState.data.id, user?.id)
      .then((optionId) => {
        if (active && mountedRef.current) setSelectedOptionId(optionId);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [asyncState.data?.id, user?.id]);

  useEffect(() => {
    if (!supabase || !asyncState.data) return;
    const issueId = asyncState.data.id;
    const client = supabase;
    const channel = client
      .channel(`issue:${issueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "issue_votes",
          filter: `issue_id=eq.${issueId}`
        },
        () => asyncState.reload({ silent: true })
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `issue_id=eq.${issueId}`
        },
        () => asyncState.reload({ silent: true })
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [asyncState.data?.id, asyncState.reload]);

  const submitVote = async (optionId: string) => {
    if (!asyncState.data || !user) throw new Error("로그인이 필요합니다.");

    setVoting(true);
    const previous = selectedOptionId;
    setSelectedOptionId(optionId);

    try {
      await voteIssue(asyncState.data.id, optionId, user.id);
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
    voting,
    submitVote
  };
}

export async function assertSupabaseReady() {
  getSupabaseClient();
}
