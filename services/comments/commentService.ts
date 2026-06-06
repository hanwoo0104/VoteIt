import { apiFetch } from "@/services/api/http";
import type { Comment, CommentSort } from "@/types";

export async function fetchComments(issueId: string, sort: CommentSort) {
  return apiFetch<Comment[]>(`/api/issues/${encodeURIComponent(issueId)}/comments?sort=${sort}`);
}

export async function createComment(issueId: string, body: string, _userId: string, parentId?: string) {
  await apiFetch<{ ok: true }>(`/api/issues/${encodeURIComponent(issueId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, parentId })
  });
}

export async function deleteComment(commentId: string) {
  await apiFetch<{ ok: true }>(`/api/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
}

export async function updateComment(commentId: string, body: string) {
  await apiFetch<{ ok: true }>(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: "PUT",
    body: JSON.stringify({ body })
  });
}

export async function toggleCommentLike(commentId: string, _userId: string, liked: boolean) {
  await apiFetch<{ ok: true }>(`/api/comments/${encodeURIComponent(commentId)}/like`, {
    method: "POST",
    body: JSON.stringify({ liked })
  });
}

export async function reportComment(commentId: string, _userId: string, reason = "user_report") {
  await apiFetch<{ ok: true }>(`/api/comments/${encodeURIComponent(commentId)}/report`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

