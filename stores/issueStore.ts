"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface IssueState {
  votes: Record<string, string>;
  voteIssue: (issueId: string, optionId: string) => void;
  clearVote: (issueId: string) => void;
}

export const useIssueStore = create<IssueState>()(
  persist(
    (set) => ({
      votes: {},
      voteIssue(issueId, optionId) {
        set((state) => ({
          votes: {
            ...state.votes,
            [issueId]: optionId
          }
        }));
      },
      clearVote(issueId) {
        set((state) => {
          const next = { ...state.votes };
          delete next[issueId];
          return { votes: next };
        });
      }
    }),
    {
      name: "voteit-votes"
    }
  )
);
