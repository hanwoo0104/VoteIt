"use client";

import { useMemo, useState } from "react";
import { Check, Flag, Heart, MessageCircle, MoreVertical, Pencil, RefreshCw, Send, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { ShimmerLoader } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useAuthStore } from "@/stores/authStore";
import { useComments } from "@/hooks/useComments";
import type { Comment } from "@/types";
import { cn, initials, relativeTime } from "@/lib/utils";

export function CommentSection({ issueId }: { issueId: string }) {
  const user = useAuthStore((state) => state.user);
  const { comments, sort, setSort, loading, error, reload, addComment, deleteComment, updateComment, toggleLike, report } = useComments(issueId);
  const [body, setBody] = useState("");
  const [submitError, setSubmitError] = useState("");

  const sorted = useMemo(() => comments, [comments]);

  const submit = async () => {
    if (!user) return;
    setSubmitError("");
    try {
      await addComment(body);
      setBody("");
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "댓글 작성에 실패했습니다.");
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-vote-ink">댓글</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-black text-slate-500 transition active:scale-[0.98] disabled:opacity-50"
            onClick={() => reload()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            새로고침
          </button>
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
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-soft">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={user ? "다른 의견도 이해할 수 있게 남겨보세요." : "로그인 후 댓글을 남길 수 있어요."}
          disabled={!user}
          className="min-h-[92px] border-0 bg-slate-50 shadow-none"
        />
        {submitError ? <p className="mt-2 text-xs font-semibold text-vote-red">{submitError}</p> : null}
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="primary" onClick={submit} disabled={!user || !body.trim()}>
            <Send className="h-4 w-4" />
            작성
          </Button>
        </div>
      </div>

      {loading ? <ShimmerLoader text="댓글을 불러오는 중..." /> : null}
      {error ? <ErrorState description={error} onRetry={reload} /> : null}

      <div className="space-y-3">
        {sorted.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            addComment={addComment}
            deleteComment={deleteComment}
            updateComment={updateComment}
            toggleLike={toggleLike}
            report={report}
          />
        ))}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  depth = 0,
  addComment,
  deleteComment,
  updateComment,
  toggleLike,
  report
}: {
  comment: Comment;
  depth?: number;
  addComment: (body: string, parentId?: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  updateComment: (commentId: string, body: string) => Promise<void>;
  toggleLike: (commentId: string, liked: boolean) => Promise<void>;
  report: (commentId: string) => Promise<void>;
}) {
  const user = useAuthStore((state) => state.user);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"report" | "delete" | null>(null);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const canEdit = Boolean(user && user.id === comment.author.id);
  const canDelete = Boolean(user && (user.id === comment.author.id || user.role === "admin"));
  const canReport = Boolean(user && !comment.reported && user.id !== comment.author.id);
  const canReply = Boolean(user && depth === 0);
  const visibleReplies = depth === 0 && !repliesExpanded ? comment.replies.slice(0, 2) : comment.replies;
  const hiddenRepliesCount = depth === 0 ? Math.max(comment.replies.length - visibleReplies.length, 0) : 0;

  const submitReply = async () => {
    if (!canReply) return;
    setError("");
    try {
      await addComment(reply, comment.id);
      setReply("");
      setReplyOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "답글 작성에 실패했습니다.");
    }
  };

  const remove = async () => {
    if (!canDelete || deleting) return;
    setError("");
    setConfirmAction(null);
    setMenuOpen(false);
    setDeleting(true);
    try {
      await deleteComment(comment.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "댓글 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = () => {
    if (!canEdit) return;
    setError("");
    setReplyOpen(false);
    setEditBody(comment.body);
    setEditing(true);
    setMenuOpen(false);
  };

  const saveEdit = async () => {
    if (!canEdit || savingEdit || !editBody.trim()) return;
    setError("");
    setSavingEdit(true);
    try {
      await updateComment(comment.id, editBody);
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "댓글 수정에 실패했습니다.");
    } finally {
      setSavingEdit(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditBody(comment.body);
    setError("");
  };

  const openReply = () => {
    if (!canReply) return;
    setEditing(false);
    setReplyOpen((value) => !value);
    setMenuOpen(false);
  };

  const requestReport = () => {
    if (!canReport || reporting) return;
    setMenuOpen(false);
    setConfirmAction("report");
  };

  const requestDelete = () => {
    if (!canDelete || deleting) return;
    setMenuOpen(false);
    setConfirmAction("delete");
  };

  const submitReport = async () => {
    if (!canReport || reporting) return;
    setError("");
    setReporting(true);
    try {
      await report(comment.id);
      setConfirmAction(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "댓글 신고에 실패했습니다.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <>
      <motion.article
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-3xl bg-white p-4 shadow-sm", depth > 0 && "ml-7 bg-slate-50 shadow-none")}
      >
        <div className="flex gap-3">
          <CommentAvatar nickname={comment.author.nickname} avatarUrl={comment.author.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-vote-ink">{comment.author.nickname}</p>
                <p className="text-[11px] font-semibold text-slate-400">
                  {relativeTime(comment.createdAt)}
                  {comment.edited ? <span className="ml-1">(수정됨)</span> : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {comment.reported ? <span className="text-[11px] font-black text-vote-red">신고됨</span> : null}
                <CommentActionMenu
                  open={menuOpen}
                  onOpenChange={setMenuOpen}
                  canReport={canReport}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  deleting={deleting}
                  reporting={reporting}
                  onReport={requestReport}
                  onEdit={startEdit}
                  onDelete={requestDelete}
                />
              </div>
            </div>
            {editing ? (
              <div className="mt-3 rounded-3xl bg-slate-50 p-3">
                <Textarea
                  value={editBody}
                  onChange={(event) => setEditBody(event.target.value)}
                  className="min-h-[86px] border-0 bg-white shadow-none"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="soft" onClick={cancelEdit} disabled={savingEdit}>
                    <X className="h-4 w-4" />
                    취소
                  </Button>
                  <Button size="sm" variant="primary" onClick={saveEdit} disabled={savingEdit || !editBody.trim()}>
                    <Check className="h-4 w-4" />
                    {savingEdit ? "저장 중" : "저장"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[14px] leading-relaxed text-slate-700">{comment.body}</p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 1.22 }}
                className={cn("flex items-center gap-1 text-xs font-black", comment.likedByMe ? "text-vote-red" : "text-slate-400")}
                onClick={() => toggleLike(comment.id, Boolean(comment.likedByMe)).catch(() => undefined)}
                disabled={!user}
              >
                <Heart className={cn("h-4 w-4", comment.likedByMe && "fill-current")} />
                {comment.likes}
              </motion.button>
              {depth === 0 ? (
                <button
                  className="flex items-center gap-1 text-xs font-black text-slate-400 disabled:opacity-45"
                  onClick={openReply}
                  disabled={!canReply}
                >
                  <MessageCircle className="h-4 w-4" />
                  답글
                </button>
              ) : null}
            </div>
            {error ? <p className="mt-2 text-xs font-semibold text-vote-red">{error}</p> : null}
            {replyOpen ? (
              <div className="mt-3">
                <div className="flex gap-2">
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
              </div>
            ) : null}
          </div>
        </div>
        {depth === 0 && comment.replies.length > 0 ? (
          <div className="mt-3 space-y-3">
            {visibleReplies.map((replyComment) => (
              <CommentItem
                key={replyComment.id}
                comment={replyComment}
                depth={depth + 1}
                addComment={addComment}
                deleteComment={deleteComment}
                updateComment={updateComment}
                toggleLike={toggleLike}
                report={report}
              />
            ))}
            {comment.replies.length > 2 ? (
              <button
                type="button"
                onClick={() => setRepliesExpanded((value) => !value)}
                className="ml-7 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-200 active:scale-[0.98]"
              >
                {repliesExpanded ? "답글 닫기" : `답글 ${hiddenRepliesCount}개 더 보기`}
              </button>
            ) : null}
          </div>
        ) : null}
      </motion.article>

      <ConfirmCommentActionModal
        action={confirmAction}
        deleting={deleting}
        reporting={reporting}
        onClose={() => setConfirmAction(null)}
        onConfirm={confirmAction === "delete" ? remove : submitReport}
      />
    </>
  );
}

function CommentAvatar({ nickname, avatarUrl }: { nickname: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <div
        className="h-10 w-10 shrink-0 rounded-2xl bg-slate-200 bg-cover bg-center"
        style={{ backgroundImage: `url(${avatarUrl})` }}
        aria-label={`${nickname} 프로필 이미지`}
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-sm font-black text-white">
      {initials(nickname)}
    </div>
  );
}

function CommentActionMenu({
  open,
  onOpenChange,
  canReport,
  canEdit,
  canDelete,
  deleting,
  reporting,
  onReport,
  onEdit,
  onDelete
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canReport: boolean;
  canEdit: boolean;
  canDelete: boolean;
  deleting: boolean;
  reporting: boolean;
  onReport: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hasActions = canReport || canEdit || canDelete;

  if (!hasActions) {
    return null;
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
      onFocus={() => onOpenChange(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onOpenChange(false);
        }
      }}
    >
      <button
        type="button"
        aria-label="댓글 메뉴"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-vote-ink active:scale-95"
        onClick={() => onOpenChange(!open)}
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open ? (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.12 }}
          className="absolute right-0 top-10 z-30 w-36 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-soft"
        >
          {canReport ? <MenuButton icon={Flag} label={reporting ? "신고 중" : "신고"} onClick={onReport} disabled={reporting} /> : null}
          {canEdit ? <MenuButton icon={Pencil} label="수정" onClick={onEdit} /> : null}
          {canDelete ? (
            <MenuButton icon={Trash2} label={deleting ? "삭제 중" : "삭제"} onClick={onDelete} danger disabled={deleting} />
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}

function ConfirmCommentActionModal({
  action,
  deleting,
  reporting,
  onClose,
  onConfirm
}: {
  action: "report" | "delete" | null;
  deleting: boolean;
  reporting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isDelete = action === "delete";
  const pending = isDelete ? deleting : reporting;

  return (
    <Modal open={Boolean(action)} title={isDelete ? "댓글을 삭제할까요?" : "댓글을 신고할까요?"} onClose={onClose}>
      <p className="text-sm leading-relaxed text-slate-600">
        {isDelete
          ? "삭제한 댓글과 그 답글은 복구할 수 없습니다."
          : "신고된 댓글은 운영자가 검토합니다. 허위 신고는 처리되지 않을 수 있어요."}
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="soft" size="sm" onClick={onClose} disabled={pending}>
          취소
        </Button>
        <Button variant={isDelete ? "red" : "primary"} size="sm" onClick={onConfirm} disabled={pending}>
          {pending ? (isDelete ? "삭제 중" : "신고 중") : isDelete ? "삭제하기" : "신고하기"}
        </Button>
      </div>
    </Modal>
  );
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
  disabled = false
}: {
  icon: typeof MessageCircle;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-black transition hover:bg-slate-50 disabled:opacity-45",
        danger ? "text-vote-red" : "text-vote-ink"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
