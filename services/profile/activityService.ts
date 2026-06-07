import { apiFetch } from "@/services/api/http";

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

export async function fetchMyActivity(): Promise<MyActivitySummary> {
  return apiFetch<MyActivitySummary>("/api/profile/activity");
}
