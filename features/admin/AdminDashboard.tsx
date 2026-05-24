"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Flame, MessageCircleWarning, Pencil, Plus, Save, Trash2, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { issues, politicians } from "@/services/data/mockData";
import { useAuthStore } from "@/stores/authStore";
import { useCommentStore } from "@/stores/commentStore";
import { formatNumber } from "@/lib/utils";

interface AdminOption {
  title: string;
  pros: string;
  cons: string;
  politicianId: string;
}

interface AdminIssue {
  id: string;
  title: string;
  summary: string;
  hot: boolean;
  published: boolean;
  newsTitle: string;
  newsUrl: string;
  options: AdminOption[];
}

const emptyIssue = (): AdminIssue => ({
  id: `draft-${Date.now()}`,
  title: "",
  summary: "",
  hot: false,
  published: true,
  newsTitle: "",
  newsUrl: "",
  options: Array.from({ length: 4 }).map(() => ({
    title: "",
    pros: "",
    cons: "",
    politicianId: politicians[0]?.id ?? ""
  }))
});

const initialAdminIssues: AdminIssue[] = issues.map((issue) => ({
  id: issue.id,
  title: issue.title,
  summary: issue.summary,
  hot: issue.hot,
  published: issue.published,
  newsTitle: issue.newsLinks[0]?.title ?? "",
  newsUrl: issue.newsLinks[0]?.url ?? "",
  options: issue.options.map((option) => ({
    title: option.title,
    pros: option.pros.join("\n"),
    cons: option.cons.join("\n"),
    politicianId: option.politicianIds[0] ?? politicians[0]?.id ?? ""
  }))
}));

export function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const setDemoRole = useAuthStore((state) => state.setDemoRole);
  const [adminIssues, setAdminIssues] = useState(initialAdminIssues);
  const [selectedId, setSelectedId] = useState(adminIssues[0]?.id ?? "new");
  const selected = adminIssues.find((issue) => issue.id === selectedId) ?? emptyIssue();
  const commentsByIssue = useCommentStore((state) => state.commentsByIssue);

  const reportedComments = useMemo(() => {
    return Object.values(commentsByIssue)
      .flat()
      .filter((comment) => comment.reported);
  }, [commentsByIssue]);

  const totals = {
    users: 12840,
    participants: issues.reduce((sum, issue) => sum + issue.participants, 0),
    reports: reportedComments.length,
    hot: adminIssues.filter((issue) => issue.hot).length
  };

  const saveIssue = (issue: AdminIssue) => {
    setAdminIssues((current) => {
      const exists = current.some((item) => item.id === issue.id);
      return exists ? current.map((item) => (item.id === issue.id ? issue : item)) : [issue, ...current];
    });
    setSelectedId(issue.id);
  };

  const removeIssue = (issueId: string) => {
    setAdminIssues((current) => current.filter((issue) => issue.id !== issueId));
    setSelectedId("new");
  };

  if (user?.role !== "admin") {
    return (
      <AppShell wide showBottomNav={false} className="px-5 py-8">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-6 text-center shadow-soft">
          <h1 className="text-2xl font-black text-vote-ink">관리자 권한이 필요해요</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">해커톤 시연용으로 관리자 계정 전환을 바로 사용할 수 있습니다.</p>
          <Button variant="primary" size="lg" className="mt-5 w-full" onClick={() => setDemoRole("admin")}>
            관리자 데모 시작
          </Button>
          <Link href="/login">
            <Button variant="outline" size="lg" className="mt-2 w-full">
              로그인 페이지
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell wide showBottomNav={false} className="px-5 pb-12">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge className="bg-vote-red/10 text-vote-red">Admin</Badge>
          <h1 className="mt-3 text-3xl font-black text-vote-ink md:text-4xl">관리자 대시보드</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">현안, 의견 4개, 장단점, 정치인 연결, 뉴스 링크, 신고 관리를 한 곳에서 처리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="soft" onClick={() => setSelectedId("new")}>
            <Plus className="h-5 w-5" />새 현안
          </Button>
          <Link href="/">
            <Button variant="outline">앱으로</Button>
          </Link>
        </div>
      </div>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <Metric icon={UsersRound} label="사용자 수" value={formatNumber(totals.users)} />
        <Metric icon={Eye} label="현안 참여 수" value={formatNumber(totals.participants)} />
        <Metric icon={MessageCircleWarning} label="댓글 신고" value={`${totals.reports}`} />
        <Metric icon={Flame} label="핫이슈" value={`${totals.hot}`} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="space-y-3">
          {adminIssues.map((issue) => (
            <motion.button
              key={issue.id}
              layout
              onClick={() => setSelectedId(issue.id)}
              className={`w-full rounded-3xl p-4 text-left shadow-sm transition ${
                selectedId === issue.id ? "bg-vote-blue text-white" : "bg-white text-vote-ink hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{issue.title}</p>
                  <p className={`mt-1 line-clamp-2 text-xs ${selectedId === issue.id ? "text-white/70" : "text-slate-500"}`}>
                    {issue.summary}
                  </p>
                </div>
                {issue.hot ? <Flame className="h-5 w-5 shrink-0 text-vote-red" /> : null}
              </div>
            </motion.button>
          ))}
        </section>

        <IssueEditor key={selectedId} issue={selectedId === "new" ? emptyIssue() : selected} onSave={saveIssue} onDelete={removeIssue} />
      </div>

      <section className="mt-6 rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black text-vote-ink">댓글 신고 관리</h2>
        {reportedComments.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">현재 신고된 댓글이 없습니다.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {reportedComments.map((comment) => (
              <div key={comment.id} className="rounded-2xl bg-vote-red/10 p-4">
                <p className="text-sm font-bold text-vote-ink">{comment.author.nickname}</p>
                <p className="mt-1 text-sm text-slate-600">{comment.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft">
      <Icon className="h-5 w-5 text-vote-red" />
      <p className="mt-4 text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-vote-ink">{value}</p>
    </div>
  );
}

function IssueEditor({
  issue,
  onSave,
  onDelete
}: {
  issue: AdminIssue;
  onSave: (issue: AdminIssue) => void;
  onDelete: (issueId: string) => void;
}) {
  const [draft, setDraft] = useState(issue);
  const setOption = (index: number, patch: Partial<AdminOption>) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (optionIndex === index ? { ...option, ...patch } : option))
    }));
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black text-vote-ink">{issue.title ? "현안 수정" : "현안 추가"}</h2>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => onSave(draft)}>
            <Save className="h-4 w-4" />
            저장
          </Button>
          {issue.title ? (
            <Button variant="outline" size="sm" onClick={() => onDelete(issue.id)}>
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="현안 제목">
          <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="예: 새 정치 현안" />
        </Field>
        <Field label="뉴스 링크 제목">
          <Input value={draft.newsTitle} onChange={(event) => setDraft({ ...draft, newsTitle: event.target.value })} placeholder="관련 뉴스 제목" />
        </Field>
        <Field label="요약">
          <Textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} className="min-h-[92px]" />
        </Field>
        <Field label="뉴스 URL">
          <Input value={draft.newsUrl} onChange={(event) => setDraft({ ...draft, newsUrl: event.target.value })} placeholder="https://..." />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Toggle active={draft.hot} label="핫이슈 지정" onClick={() => setDraft({ ...draft, hot: !draft.hot })} />
        <Toggle active={draft.published} label="공개 여부" onClick={() => setDraft({ ...draft, published: !draft.published })} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {draft.options.map((option, index) => (
          <div key={index} className="rounded-3xl border border-slate-100 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-vote-red" />
              <p className="font-black text-vote-ink">의견 {index + 1}</p>
            </div>
            <div className="space-y-3">
              <Input value={option.title} onChange={(event) => setOption(index, { title: event.target.value })} placeholder="의견 제목" />
              <Textarea value={option.pros} onChange={(event) => setOption(index, { pros: event.target.value })} placeholder="장점 입력, 줄바꿈으로 구분" />
              <Textarea value={option.cons} onChange={(event) => setOption(index, { cons: event.target.value })} placeholder="단점 입력, 줄바꿈으로 구분" />
              <Select value={option.politicianId} onChange={(event) => setOption(index, { politicianId: event.target.value })}>
                {politicians.map((politician) => (
                  <option key={politician.id} value={politician.id}>
                    {politician.name} · {politician.party}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-vote-ink">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-black transition ${active ? "bg-vote-red text-white" : "bg-slate-100 text-slate-500"}`}
    >
      {label}
    </button>
  );
}
