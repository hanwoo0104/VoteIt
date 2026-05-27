"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, Flame, MessageCircleWarning, Pencil, Plus, Save, Trash2, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShimmerLoader } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { RequireAuth } from "@/features/auth/RequireAuth";
import {
  deleteAdminIssue,
  fetchAdminStats,
  fetchPendingReports,
  resolveReport,
  upsertAdminIssue,
  type AdminIssueInput,
  type AdminIssueOptionInput
} from "@/services/admin/adminService";
import { fetchPoliticians } from "@/services/chat/chatService";
import { useIssues } from "@/hooks/useIssues";
import { useAuthStore } from "@/stores/authStore";
import { formatNumber } from "@/lib/utils";
import type { Issue, Politician } from "@/types";

type DraftIssue = AdminIssueInput;

const emptyDraft = (): DraftIssue => ({
  slug: "",
  title: "",
  summary: "",
  description: "",
  hot: false,
  published: true,
  newsTitle: "",
  newsOutlet: "VoteIt",
  newsUrl: "",
  options: Array.from({ length: 4 }).map(() => ({
    title: "",
    shortText: "",
    partyAlignment: "",
    difference: "",
    pros: [],
    cons: [],
    politicianId: ""
  }))
});

function issueToDraft(issue: Issue): DraftIssue {
  const baseOptions = emptyDraft().options;
  const options = Array.from({ length: 4 }).map((_, index) => {
    const option = issue.options[index];
    if (!option) return baseOptions[index];

    return {
      id: option.id,
      title: option.title,
      shortText: option.shortText,
      partyAlignment: option.partyAlignment,
      difference: option.difference,
      pros: option.pros,
      cons: option.cons,
      politicianId: option.politicianIds[0] ?? ""
    };
  });

  return {
    id: issue.id,
    slug: issue.slug,
    title: issue.title,
    summary: issue.summary,
    description: issue.description,
    hot: issue.hot,
    published: issue.published,
    newsTitle: issue.newsLinks[0]?.title ?? "",
    newsOutlet: issue.newsLinks[0]?.outlet ?? "VoteIt",
    newsUrl: issue.newsLinks[0]?.url ?? "",
    options
  };
}

export function AdminDashboard() {
  return (
    <RequireAuth>
      <AdminContent />
    </RequireAuth>
  );
}

function AdminContent() {
  const user = useAuthStore((state) => state.user);
  const { data: issues, loading, error, reload } = useIssues();
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [draft, setDraft] = useState<DraftIssue>(emptyDraft());
  const [stats, setStats] = useState({ users: 0, participants: 0, reports: 0, hot: 0 });
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);
  const [saving, setSaving] = useState(false);
  const [adminError, setAdminError] = useState("");

  const selectedIssue = useMemo(() => issues?.find((issue) => issue.id === selectedId), [issues, selectedId]);

  useEffect(() => {
    if (selectedId === "new") setDraft(emptyDraft());
    if (selectedIssue) setDraft(issueToDraft(selectedIssue));
  }, [selectedId, selectedIssue]);

  const loadAdmin = async () => {
    if (user?.role !== "admin") return;
    setAdminError("");
    try {
      const [loadedStats, loadedPoliticians, loadedReports] = await Promise.all([
        fetchAdminStats(),
        fetchPoliticians(),
        fetchPendingReports()
      ]);
      setStats(loadedStats);
      setPoliticians(loadedPoliticians);
      setReports(loadedReports as Array<Record<string, unknown>>);
    } catch (caught) {
      setAdminError(caught instanceof Error ? caught.message : "관리자 데이터를 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    loadAdmin();
  }, [user?.role]);

  const save = async () => {
    setSaving(true);
    setAdminError("");
    try {
      const savedIssue = await upsertAdminIssue({
        ...draft,
        slug: draft.slug || draft.title.toLowerCase().replace(/\s+/g, "-")
      });
      setSelectedId(savedIssue.id);
      await Promise.all([reload(), loadAdmin()]);
    } catch (caught) {
      setAdminError(caught instanceof Error ? caught.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    setSaving(true);
    try {
      await deleteAdminIssue(draft.id);
      setSelectedId("new");
      await Promise.all([reload(), loadAdmin()]);
    } catch (caught) {
      setAdminError(caught instanceof Error ? caught.message : "삭제에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== "admin") {
    return (
      <AppShell wide showBottomNav={false} className="px-5 py-8">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-6 text-center shadow-soft">
          <h1 className="text-2xl font-black text-vote-ink">관리자 권한이 필요해요</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">관리자 계정으로 로그인해야 운영 기능을 사용할 수 있습니다.</p>
          <Link href="/login">
            <Button variant="primary" size="lg" className="mt-5 w-full">
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
          <p className="mt-2 text-sm font-medium text-slate-500">현안, 의견, 뉴스, 신고, 통계를 실제 DB 기준으로 운영합니다.</p>
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
        <Metric icon={UsersRound} label="사용자 수" value={formatNumber(stats.users)} />
        <Metric icon={Eye} label="현안 참여 수" value={formatNumber(stats.participants)} />
        <Metric icon={MessageCircleWarning} label="댓글 신고" value={`${stats.reports}`} />
        <Metric icon={Flame} label="핫이슈" value={`${stats.hot}`} />
      </section>

      {adminError ? <ErrorState description={adminError} onRetry={loadAdmin} /> : null}
      {loading ? <ShimmerLoader text="운영 데이터를 불러오는 중..." /> : null}
      {error ? <ErrorState description={error} onRetry={reload} /> : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="space-y-3">
          {(issues ?? []).map((issue) => (
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

        <IssueEditor
          draft={draft}
          politicians={politicians}
          saving={saving}
          onChange={setDraft}
          onSave={save}
          onDelete={remove}
        />
      </div>

      <section className="mt-6 rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black text-vote-ink">댓글 신고 관리</h2>
        {reports.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">현재 처리 대기 신고가 없습니다.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {reports.map((report) => (
              <div key={String(report.id)} className="rounded-2xl bg-vote-red/10 p-4">
                <p className="text-sm font-bold text-vote-ink">신고 사유: {String(report.reason ?? "user_report")}</p>
                <p className="mt-1 text-sm text-slate-600">{String((report.comments as { body?: string } | null)?.body ?? "")}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => resolveReport(String(report.id), "resolved").then(loadAdmin)}>
                    처리 완료
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolveReport(String(report.id), "dismissed").then(loadAdmin)}>
                    기각
                  </Button>
                </div>
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
  draft,
  politicians,
  saving,
  onChange,
  onSave,
  onDelete
}: {
  draft: DraftIssue;
  politicians: Politician[];
  saving: boolean;
  onChange: (draft: DraftIssue) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const setOption = (index: number, patch: Partial<AdminIssueOptionInput>) => {
    onChange({
      ...draft,
      options: draft.options.map((option, optionIndex) => (optionIndex === index ? { ...option, ...patch } : option))
    });
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black text-vote-ink">{draft.id ? "현안 수정" : "현안 추가"}</h2>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4" />
            저장
          </Button>
          {draft.id ? (
            <Button variant="outline" size="sm" onClick={onDelete} disabled={saving}>
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="현안 제목">
          <Input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} />
        </Field>
        <Field label="Slug">
          <Input value={draft.slug} onChange={(event) => onChange({ ...draft, slug: event.target.value })} placeholder="presidential-term-reform" />
        </Field>
        <Field label="요약">
          <Textarea value={draft.summary} onChange={(event) => onChange({ ...draft, summary: event.target.value })} className="min-h-[92px]" />
        </Field>
        <Field label="설명">
          <Textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} className="min-h-[92px]" />
        </Field>
        <Field label="뉴스 제목">
          <Input value={draft.newsTitle} onChange={(event) => onChange({ ...draft, newsTitle: event.target.value })} />
        </Field>
        <Field label="뉴스 URL">
          <Input value={draft.newsUrl} onChange={(event) => onChange({ ...draft, newsUrl: event.target.value })} />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Toggle active={draft.hot} label="핫이슈 지정" onClick={() => onChange({ ...draft, hot: !draft.hot })} />
        <Toggle active={draft.published} label="공개 여부" onClick={() => onChange({ ...draft, published: !draft.published })} />
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
              <Textarea value={option.shortText} onChange={(event) => setOption(index, { shortText: event.target.value })} placeholder="카드에 표시될 설명" />
              <Input value={option.partyAlignment} onChange={(event) => setOption(index, { partyAlignment: event.target.value })} placeholder="가까운 정당/정치인" />
              <Textarea value={option.difference} onChange={(event) => setOption(index, { difference: event.target.value })} placeholder="다른 의견과의 차이" />
              <Textarea value={option.pros.join("\n")} onChange={(event) => setOption(index, { pros: event.target.value.split("\n").filter(Boolean) })} placeholder="장점 입력, 줄바꿈으로 구분" />
              <Textarea value={option.cons.join("\n")} onChange={(event) => setOption(index, { cons: event.target.value.split("\n").filter(Boolean) })} placeholder="단점 입력, 줄바꿈으로 구분" />
              <Select value={option.politicianId} onChange={(event) => setOption(index, { politicianId: event.target.value })}>
                <option value="">정치인 선택</option>
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
