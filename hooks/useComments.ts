"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createComment,
  deleteComment as removeComment,
  fetchComments,
  reportComment,
  toggleCommentLike,
  updateComment as editComment
} from "@/services/comments/commentService";
import { supabase } from "@/services/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import type { CommentSort } from "@/types";

interface ReloadOptions {
  silent?: boolean;
}

export function useComments(issueId: string) {
  const user = useAuthStore((state) => state.user);
  const [sort, setSort] = useState<CommentSort>("latest");
  const [comments, setComments] = useState<Awaited<ReturnType<typeof fetchComments>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const reload = useCallback(async (reloadOptions: ReloadOptions = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (!reloadOptions.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const nextComments = await fetchComments(issueId, sort, user?.id);
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setComments(nextComments);
    } catch (caught) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setError(caught instanceof Error ? caught.message : "댓글을 불러오지 못했습니다.");
    } finally {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setLoading(false);
    }
  }, [issueId, sort, user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`comments:${issueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `issue_id=eq.${issueId}`
        },
        () => reload({ silent: true })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "comment_likes" }, () => reload({ silent: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => reload({ silent: true }))
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [issueId, reload]);

  return {
    comments,
    sort,
    setSort,
    loading,
    error,
    reload,
    addComment: async (body: string, parentId?: string) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      await createComment(issueId, body, user.id, parentId);
      await reload({ silent: true });
    },
    deleteComment: async (commentId: string) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      await removeComment(commentId);
      await reload({ silent: true });
    },
    updateComment: async (commentId: string, body: string) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      await editComment(commentId, body);
      await reload({ silent: true });
    },
    toggleLike: async (commentId: string, liked: boolean) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      await toggleCommentLike(commentId, user.id, liked);
      await reload({ silent: true });
    },
    report: async (commentId: string) => {
      if (!user) throw new Error("로그인이 필요합니다.");
      await reportComment(commentId, user.id);
      await reload({ silent: true });
    }
  };
}
