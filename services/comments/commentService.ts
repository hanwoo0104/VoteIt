import { getSupabaseClient } from "@/services/supabase/client";
import { runSupabaseQuery } from "@/services/supabase/query";
import { containsProfanity, sanitizeComment } from "@/services/moderation/profanity";
import type { Comment, CommentSort, UserProfile } from "@/types";

interface CommentRow {
  id: string;
  issue_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  likes_count: number;
  created_at: string;
  updated_at: string | null;
}

interface ProfileLite {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

interface UserLite {
  id: string;
  role: UserProfile["role"];
}

function nestComments(comments: Comment[]) {
  const byId = new Map(comments.map((comment) => [comment.id, { ...comment, replies: [] as Comment[] }]));
  const roots: Comment[] = [];

  const findRootParent = (comment: Comment) => {
    let parent = comment.parentId ? byId.get(comment.parentId) : undefined;
    while (parent?.parentId && byId.has(parent.parentId)) {
      parent = byId.get(parent.parentId);
    }
    return parent;
  };

  byId.forEach((comment) => {
    const rootParent = findRootParent(comment);
    if (rootParent && rootParent.id !== comment.id) {
      rootParent.replies.push({ ...comment, replies: [] });
    } else {
      roots.push(comment);
    }
  });

  return roots;
}

function isEdited(createdAt: string, updatedAt?: string | null) {
  if (!updatedAt) return false;
  return updatedAt !== createdAt;
}

export async function fetchComments(issueId: string, sort: CommentSort, currentUserId?: string) {
  const client = getSupabaseClient();
  const { data: rows, error } = await runSupabaseQuery(
    client
      .from("comments")
      .select("id, issue_id, parent_id, user_id, body, likes_count, created_at, updated_at")
      .eq("issue_id", issueId)
      .order(sort === "likes" ? "likes_count" : "created_at", { ascending: false }),
    "댓글"
  );

  if (error) throw new Error(error.message);

  const comments = (rows ?? []) as CommentRow[];
  const userIds = [...new Set(comments.map((comment) => comment.user_id))];
  const commentIds = comments.map((comment) => comment.id);

  const [{ data: profiles }, { data: users }, { data: likes }, { data: reports }] = await Promise.all([
    userIds.length
      ? runSupabaseQuery(client.from("profiles").select("id, nickname, avatar_url").in("id", userIds), "댓글 작성자")
      : Promise.resolve({ data: [] as ProfileLite[] }),
    userIds.length
      ? runSupabaseQuery(client.from("users").select("id, role").in("id", userIds), "댓글 작성자 권한")
      : Promise.resolve({ data: [] as UserLite[] }),
    currentUserId && commentIds.length
      ? runSupabaseQuery(
          client.from("comment_likes").select("comment_id").eq("user_id", currentUserId).in("comment_id", commentIds),
          "댓글 좋아요"
        )
      : Promise.resolve({ data: [] as Array<{ comment_id: string }> }),
    currentUserId && commentIds.length
      ? runSupabaseQuery(
          client.from("reports").select("comment_id").eq("reporter_id", currentUserId).in("comment_id", commentIds),
          "댓글 신고"
        )
      : Promise.resolve({ data: [] as Array<{ comment_id: string }> })
  ]);

  const profileMap = new Map(((profiles ?? []) as ProfileLite[]).map((profile) => [profile.id, profile]));
  const roleMap = new Map(((users ?? []) as UserLite[]).map((user) => [user.id, user.role]));
  const liked = new Set((likes ?? []).map((like) => like.comment_id));
  const reported = new Set((reports ?? []).map((report) => report.comment_id));

  return nestComments(
    comments.map((comment) => {
      const profile = profileMap.get(comment.user_id);
      return {
        id: comment.id,
        issueId: comment.issue_id,
        parentId: comment.parent_id,
        author: {
          id: comment.user_id,
          nickname: profile?.nickname ?? "탈퇴한 사용자",
          role: roleMap.get(comment.user_id),
          avatarUrl: profile?.avatar_url ?? undefined
        },
        body: comment.body,
        likes: comment.likes_count,
        likedByMe: liked.has(comment.id),
        reported: reported.has(comment.id),
        createdAt: comment.created_at,
        updatedAt: comment.updated_at ?? undefined,
        edited: isEdited(comment.created_at, comment.updated_at),
        replies: []
      } satisfies Comment;
    })
  );
}

export async function createComment(issueId: string, body: string, userId: string, parentId?: string) {
  if (containsProfanity(body)) {
    throw new Error("서로 다른 의견을 이해할 수 있도록 표현을 조금만 부드럽게 바꿔 주세요.");
  }

  const client = getSupabaseClient();

  if (parentId) {
    const { data: parent, error: parentError } = await runSupabaseQuery(
      client.from("comments").select("parent_id").eq("id", parentId).single<{ parent_id: string | null }>(),
      "원댓글 확인"
    );

    if (parentError) throw new Error(parentError.message);
    if (parent?.parent_id) {
      throw new Error("답글에는 다시 답글을 달 수 없습니다. 원댓글에 답글을 남겨 주세요.");
    }
  }

  const { error } = await runSupabaseQuery(
    client.from("comments").insert({
      issue_id: issueId,
      parent_id: parentId ?? null,
      user_id: userId,
      body: sanitizeComment(body.trim())
    }),
    "댓글 작성"
  );

  if (error) throw new Error(error.message);
}

export async function deleteComment(commentId: string) {
  const client = getSupabaseClient();
  const { error } = await runSupabaseQuery(client.from("comments").delete().eq("id", commentId), "댓글 삭제");

  if (error) throw new Error(error.message);
}

export async function updateComment(commentId: string, body: string) {
  if (containsProfanity(body)) {
    throw new Error("서로 다른 의견을 이해할 수 있도록 표현을 조금만 부드럽게 바꿔 주세요.");
  }

  const client = getSupabaseClient();
  const { error } = await runSupabaseQuery(
    client
      .from("comments")
      .update({
        body: sanitizeComment(body.trim()),
        updated_at: new Date().toISOString()
      })
      .eq("id", commentId)
      .select("id")
      .single(),
    "댓글 수정"
  );

  if (error) throw new Error(error.message);
}

export async function toggleCommentLike(commentId: string, userId: string, liked: boolean) {
  const client = getSupabaseClient();
  const request = liked
    ? client.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId)
    : client.from("comment_likes").insert({ comment_id: commentId, user_id: userId });

  const { error } = await runSupabaseQuery(request, "댓글 좋아요");
  if (error) throw new Error(error.message);
}

export async function reportComment(commentId: string, userId: string, reason = "user_report") {
  const client = getSupabaseClient();
  const { error } = await runSupabaseQuery(
    client.from("reports").upsert(
      {
        comment_id: commentId,
        reporter_id: userId,
        reason
      },
      { onConflict: "comment_id,reporter_id" }
    ),
    "댓글 신고"
  );

  if (error) throw new Error(error.message);
}
