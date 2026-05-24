"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { issues } from "@/services/data/mockData";
import { containsProfanity, sanitizeComment } from "@/services/moderation/profanity";
import type { Comment, CommentAuthor } from "@/types";

const initialComments = Object.fromEntries(issues.map((issue) => [issue.id, issue.comments]));

interface AddCommentPayload {
  issueId: string;
  body: string;
  author: CommentAuthor;
  parentId?: string;
}

interface CommentState {
  commentsByIssue: Record<string, Comment[]>;
  moderationError: string | null;
  addComment: (payload: AddCommentPayload) => boolean;
  likeComment: (issueId: string, commentId: string) => void;
  reportComment: (issueId: string, commentId: string) => void;
}

function mapComments(comments: Comment[], commentId: string, updater: (comment: Comment) => Comment): Comment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) return updater(comment);
    return {
      ...comment,
      replies: mapComments(comment.replies, commentId, updater)
    };
  });
}

function appendReply(comments: Comment[], parentId: string, reply: Comment): Comment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [reply, ...comment.replies]
      };
    }
    return {
      ...comment,
      replies: appendReply(comment.replies, parentId, reply)
    };
  });
}

export const useCommentStore = create<CommentState>()(
  persist(
    (set, get) => ({
      commentsByIssue: initialComments,
      moderationError: null,
      addComment(payload) {
        if (!payload.body.trim()) return false;
        if (containsProfanity(payload.body)) {
          set({ moderationError: "서로 다른 의견을 이해할 수 있도록 표현을 조금만 부드럽게 바꿔 주세요." });
          return false;
        }

        const comment: Comment = {
          id: `comment-${crypto.randomUUID()}`,
          issueId: payload.issueId,
          parentId: payload.parentId,
          author: payload.author,
          body: sanitizeComment(payload.body.trim()),
          likes: 0,
          createdAt: new Date().toISOString(),
          replies: []
        };

        const current = get().commentsByIssue[payload.issueId] ?? [];
        set({
          moderationError: null,
          commentsByIssue: {
            ...get().commentsByIssue,
            [payload.issueId]: payload.parentId ? appendReply(current, payload.parentId, comment) : [comment, ...current]
          }
        });
        return true;
      },
      likeComment(issueId, commentId) {
        const current = get().commentsByIssue[issueId] ?? [];
        set({
          commentsByIssue: {
            ...get().commentsByIssue,
            [issueId]: mapComments(current, commentId, (comment) => ({
              ...comment,
              likedByMe: !comment.likedByMe,
              likes: comment.likedByMe ? Math.max(0, comment.likes - 1) : comment.likes + 1
            }))
          }
        });
      },
      reportComment(issueId, commentId) {
        const current = get().commentsByIssue[issueId] ?? [];
        set({
          commentsByIssue: {
            ...get().commentsByIssue,
            [issueId]: mapComments(current, commentId, (comment) => ({
              ...comment,
              reported: true
            }))
          }
        });
      }
    }),
    {
      name: "voteit-comments"
    }
  )
);
