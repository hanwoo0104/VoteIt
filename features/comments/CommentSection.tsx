"use client";

import { useMemo, useState } from "react";
import { Flag, Heart, MessageCircle, Send } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/authStore";
import { useCommentStore } from "@/stores/commentStore";
import type { Comment } from "@/types";
import { cn, initials, relativeTime } from "@/lib/utils";

export function CommentSection({ issueId }: { issueId: string }) {
  const user = useAuthStore((state) => state.user);
  const comments = useCommentStore((state) => state.commentsByIssue[issueId] ?? []);
  const moderationError = useCommentStore((state) => state.moderationError);
  const addComment = useCommentStore((state) => state.addComment);
  const [body, setBody] = useState("");
  const [sort, setSort] = useState<"latest" | "likes">("latest");

  const sorted = useMemo(() => {
    return [...comments].sort((a, b) => {
      if (sort === "likes") return b.likes - a.likes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [comments, sort]);

  const submit = () => {
    if (!user) return;
    const ok = addComment({
      issueId,
      body,
      author: {
        id: user.id,
        nickname: user.nickname,
        role: user.role
      }
    });
    if (ok) setBody("");
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-vote-ink">댓글</h2>
        <div className="rounded-full bg-slate-100 p-1">
          <button
            className={cn("rounded-full px-3 py-1.5 text-xs font-black", sort === "latest" ? "bg-white text-vote-ink shadow-sm" : "text-slate-400")}
            onClick={() => setSort("latest")}
          >
            최신순
          </button>
          <button
            className={cn("rounded-full px-3 py-1.5 text-xs font-black", sort === "likes" ? "bg-white text-vote-ink shadow-sm" : "text-slate-400")}
            onClick={() => setSort("likes")}
          >
            공감순
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-soft">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={user ? "다른 의견도 이해할 수 있게 남겨보세요." : "로그인 후 댓글을 남길 수 있어요."}
          disabled={!user}
          className="min-h-[92px] border-0 bg-slate-50 shadow-none"
        />
        {moderationError ? <p className="mt-2 text-xs font-semibold text-vote-red">{moderationError}</p> : null}
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="primary" onClick={submit} disabled={!user || !body.trim()}>
            <Send className="h-4 w-4" />
            작성
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((comment) => (
          <CommentItem key={comment.id} issueId={issueId} comment={comment} />
        ))}
      </div>
    </section>
  );
}

function CommentItem({ issueId, comment, depth = 0 }: { issueId: string; comment: Comment; depth?: number }) {
  const user = useAuthStore((state) => state.user);
  const addComment = useCommentStore((state) => state.addComment);
  const likeComment = useCommentStore((state) => state.likeComment);
  const reportComment = useCommentStore((state) => state.reportComment);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");

  const submitReply = () => {
    if (!user) return;
    const ok = addComment({
      issueId,
      parentId: comment.id,
      body: reply,
      author: { id: user.id, nickname: user.nickname, role: user.role }
    });
    if (ok) {
      setReply("");
      setReplyOpen(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-3xl bg-white p-4 shadow-sm", depth > 0 && "ml-7 bg-slate-50 shadow-none")}
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-sm font-black text-white">
          {initials(comment.author.nickname)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-vote-ink">{comment.author.nickname}</p>
              <p className="text-[11px] font-semibold text-slate-400">{relativeTime(comment.createdAt)}</p>
            </div>
            {comment.reported ? <span className="text-[11px] font-black text-vote-red">신고됨</span> : null}
          </div>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-700">{comment.body}</p>
          <div className="mt-3 flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 1.22 }}
              className={cn("flex items-center gap-1 text-xs font-black", comment.likedByMe ? "text-vote-red" : "text-slate-400")}
              onClick={() => likeComment(issueId, comment.id)}
            >
              <Heart className={cn("h-4 w-4", comment.likedByMe && "fill-current")} />
              {comment.likes}
            </motion.button>
            <button className="flex items-center gap-1 text-xs font-black text-slate-400" onClick={() => setReplyOpen((value) => !value)}>
              <MessageCircle className="h-4 w-4" />
              답글
            </button>
            <button className="flex items-center gap-1 text-xs font-black text-slate-400" onClick={() => reportComment(issueId, comment.id)}>
              <Flag className="h-4 w-4" />
              신고
            </button>
          </div>
          {replyOpen ? (
            <div className="mt-3 flex gap-2">
              <input
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-2xl bg-white px-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-vote-blue"
                placeholder={user ? "답글 입력" : "로그인 필요"}
                disabled={!user}
              />
              <Button size="sm" variant="primary" onClick={submitReply} disabled={!user || !reply.trim()}>
                등록
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {comment.replies.length > 0 ? (
        <div className="mt-3 space-y-3">
          {comment.replies.map((replyComment) => (
            <CommentItem key={replyComment.id} issueId={issueId} comment={replyComment} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </motion.article>
  );
}
