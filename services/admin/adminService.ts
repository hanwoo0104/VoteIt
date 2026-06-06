import { apiFetch } from "@/services/api/http";

export interface AdminIssueOptionInput {
  id?: string;
  title: string;
  shortText: string;
  partyAlignment: string;
  difference: string;
  pros: string[];
  cons: string[];
  politicianId?: string;
}

export interface AdminIssueInput {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  hot: boolean;
  published: boolean;
  newsTitle: string;
  newsOutlet: string;
  newsUrl: string;
  options: AdminIssueOptionInput[];
}

export async function fetchAdminStats() {
  return apiFetch<{ users: number; participants: number; reports: number; hot: number }>("/api/admin/stats");
}

export async function upsertAdminIssue(input: AdminIssueInput) {
  return apiFetch<{ id: string }>("/api/admin/issues", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function deleteAdminIssue(issueId: string) {
  await apiFetch<{ ok: true }>(`/api/admin/issues/${encodeURIComponent(issueId)}`, { method: "DELETE" });
}

export async function fetchPendingReports() {
  return apiFetch<Array<Record<string, unknown>>>("/api/admin/reports");
}

export async function resolveReport(reportId: string, status: "resolved" | "dismissed") {
  await apiFetch<{ ok: true }>(`/api/admin/reports/${encodeURIComponent(reportId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function deleteReportedComment(commentId: string) {
  await apiFetch<{ ok: true }>(`/api/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
}
