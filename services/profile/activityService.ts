import { getSupabaseClient } from "@/services/supabase/client";
import { runSupabaseQuery } from "@/services/supabase/query";

interface VoteRow {
  issue_id: string;
  issue_option_id: string;
  created_at: string;
}

interface IssueRow {
  id: string;
  slug: string;
  title: string;
}

interface OptionRow {
  id: string;
  title: string;
  short_text: string;
}

interface CommentRow {
  id: string;
  issue_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
}

interface LikeRow {
  comment_id: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  nickname: string;
}

export interface MyVoteActivity {
  issueId: string;
  issueSlug: string;
  issueTitle: string;
  optionTitle: string;
  optionText: string;
  createdAt: string;
}

export interface MyCommentActivity {
  id: string;
  issueId: string;
  issueSlug: string;
  issueTitle: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MyLikedCommentActivity {
  id: string;
  issueId: string;
  issueSlug: string;
  issueTitle: string;
  body: string;
  authorNickname: string;
  likedAt: string;
}

export interface MyActivitySummary {
  votes: MyVoteActivity[];
  comments: MyCommentActivity[];
  likedComments: MyLikedCommentActivity[];
  replies: MyCommentActivity[];
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])];
}

export async function fetchMyActivity(userId: string): Promise<MyActivitySummary> {
  const client = getSupabaseClient();

  const [{ data: votes, error: votesError }, { data: myComments, error: commentsError }, { data: likes, error: likesError }] =
    await Promise.all([
      runSupabaseQuery(
        client
          .from("issue_votes")
          .select("issue_id, issue_option_id, created_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .returns<VoteRow[]>(),
        "내 투표"
      ),
      runSupabaseQuery(
        client
          .from("comments")
          .select("id, issue_id, parent_id, user_id, body, created_at, updated_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .returns<CommentRow[]>(),
        "내 댓글"
      ),
      runSupabaseQuery(
        client
          .from("comment_likes")
          .select("comment_id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .returns<LikeRow[]>(),
        "내 공감 댓글"
      )
    ]);

  if (votesError) throw new Error(votesError.message);
  if (commentsError) throw new Error(commentsError.message);
  if (likesError) throw new Error(likesError.message);

  const likedCommentIds = (likes ?? []).map((like) => like.comment_id);
  const { data: likedComments, error: likedCommentsError } = likedCommentIds.length
    ? await runSupabaseQuery(
        client
          .from("comments")
          .select("id, issue_id, parent_id, user_id, body, created_at, updated_at")
          .in("id", likedCommentIds)
          .returns<CommentRow[]>(),
        "공감한 댓글"
      )
    : { data: [] as CommentRow[], error: null };

  if (likedCommentsError) throw new Error(likedCommentsError.message);

  const issueIds = unique([
    ...(votes ?? []).map((vote) => vote.issue_id),
    ...(myComments ?? []).map((comment) => comment.issue_id),
    ...(likedComments ?? []).map((comment) => comment.issue_id)
  ]);
  const optionIds = unique((votes ?? []).map((vote) => vote.issue_option_id));
  const authorIds = unique((likedComments ?? []).map((comment) => comment.user_id));

  const [{ data: issues }, { data: options }, { data: profiles }] = await Promise.all([
    issueIds.length
      ? runSupabaseQuery(
          client.from("issues").select("id, slug, title").in("id", issueIds).returns<IssueRow[]>(),
          "활동 현안"
        )
      : Promise.resolve({ data: [] as IssueRow[] }),
    optionIds.length
      ? runSupabaseQuery(
          client.from("issue_options").select("id, title, short_text").in("id", optionIds).returns<OptionRow[]>(),
          "선택 의견"
        )
      : Promise.resolve({ data: [] as OptionRow[] }),
    authorIds.length
      ? runSupabaseQuery(
          client.from("profiles").select("id, nickname").in("id", authorIds).returns<ProfileRow[]>(),
          "댓글 작성자"
        )
      : Promise.resolve({ data: [] as ProfileRow[] })
  ]);

  const issueMap = new Map((issues ?? []).map((issue) => [issue.id, issue]));
  const optionMap = new Map((options ?? []).map((option) => [option.id, option]));
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const likedCommentMap = new Map((likedComments ?? []).map((comment) => [comment.id, comment]));

  const commentToActivity = (comment: CommentRow): MyCommentActivity => {
    const issue = issueMap.get(comment.issue_id);
    return {
      id: comment.id,
      issueId: comment.issue_id,
      issueSlug: issue?.slug ?? comment.issue_id,
      issueTitle: issue?.title ?? "삭제되었거나 비공개된 안건",
      body: comment.body,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at ?? undefined
    };
  };

  return {
    votes: (votes ?? []).map((vote) => {
      const issue = issueMap.get(vote.issue_id);
      const option = optionMap.get(vote.issue_option_id);
      return {
        issueId: vote.issue_id,
        issueSlug: issue?.slug ?? vote.issue_id,
        issueTitle: issue?.title ?? "삭제되었거나 비공개된 안건",
        optionTitle: option?.title ?? "선택한 의견",
        optionText: option?.short_text ?? "",
        createdAt: vote.created_at
      };
    }),
    comments: (myComments ?? []).filter((comment) => !comment.parent_id).map(commentToActivity),
    likedComments: (likes ?? [])
      .map((like) => {
        const comment = likedCommentMap.get(like.comment_id);
        if (!comment) return null;
        const issue = issueMap.get(comment.issue_id);
        const profile = profileMap.get(comment.user_id);
        return {
          id: comment.id,
          issueId: comment.issue_id,
          issueSlug: issue?.slug ?? comment.issue_id,
          issueTitle: issue?.title ?? "삭제되었거나 비공개된 안건",
          body: comment.body,
          authorNickname: profile?.nickname ?? "탈퇴한 사용자",
          likedAt: like.created_at
        } satisfies MyLikedCommentActivity;
      })
      .filter(Boolean) as MyLikedCommentActivity[],
    replies: (myComments ?? []).filter((comment) => Boolean(comment.parent_id)).map(commentToActivity)
  };
}
