import { apiFetch } from "@/services/api/http";
import type { Politician } from "@/types";

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

export interface AdminPoliticianInput {
  name: string;
  phone: string;
  password: string;
  party: string;
  roleTitle: string;
  region: string;
  tags: string[];
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

export async function fetchAdminPoliticians() {
  return apiFetch<Politician[]>("/api/admin/politicians");
}

export async function createAdminPolitician(input: AdminPoliticianInput, avatarFile?: File | null) {
  const form = new FormData();
  form.set("name", input.name);
  form.set("phone", input.phone);
  form.set("password", input.password);
  form.set("party", input.party);
  form.set("roleTitle", input.roleTitle);
  form.set("region", input.region);
  form.set("tags", input.tags.join("\n"));
  if (avatarFile) form.set("avatar", avatarFile);

  return apiFetch<Politician>("/api/admin/politicians", {
    method: "POST",
    body: form
  });
}

export async function uploadAdminPoliticianAvatar(politicianId: string, avatarFile: File) {
  const form = new FormData();
  form.set("avatar", avatarFile);
  return apiFetch<Politician>(`/api/admin/politicians/${encodeURIComponent(politicianId)}/avatar`, {
    method: "POST",
    body: form
  });
}
