import { apiFetch } from "@/services/api/http";
import type { Issue } from "@/types";

export async function fetchIssues() {
  return apiFetch<Issue[]>("/api/issues");
}

export async function fetchAdminIssues() {
  return apiFetch<Issue[]>("/api/issues?admin=1");
}

export async function fetchIssueBySlug(slug: string) {
  return apiFetch<Issue>(`/api/issues/${encodeURIComponent(slug)}`);
}

export async function recordIssueView(issueId: string) {
  await apiFetch<{ ok: true }>(`/api/issues/${encodeURIComponent(issueId)}/view`, { method: "POST" });
}

export async function fetchMyVote(issueId: string) {
  const result = await fetchMyVoteStatus(issueId);
  return result.optionId;
}

export async function fetchMyVoteStatus(issueId: string) {
  return apiFetch<{ optionId: string | null; canceled: boolean }>(`/api/issues/${encodeURIComponent(issueId)}/vote`);
}

export async function voteIssue(issueId: string, optionId: string) {
  await apiFetch<{ ok: true }>(`/api/issues/${encodeURIComponent(issueId)}/vote`, {
    method: "POST",
    body: JSON.stringify({ optionId })
  });
}

export async function cancelIssueVote(issueId: string) {
  await apiFetch<{ ok: true }>(`/api/issues/${encodeURIComponent(issueId)}/vote`, { method: "DELETE" });
}
