"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Flame, Search, UsersRound, X } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShimmerLoader } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { useIssues } from "@/hooks/useIssues";
import { formatNumber } from "@/lib/utils";

export function IssueListScreen() {
  return (
    <RequireAuth>
      <IssueListContent />
    </RequireAuth>
  );
}

function IssueListContent() {
  const { data: issues, loading, error, reload } = useIssues();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredIssues = useMemo(() => {
    if (!normalizedQuery) return issues ?? [];

    return (issues ?? []).filter((issue) => {
      const searchable = [
        issue.title,
        issue.summary,
        issue.description,
        ...issue.options.flatMap((option) => [option.title, option.shortText, option.partyAlignment, option.difference])
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [issues, normalizedQuery]);

  return (
    <AppShell className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-vote-ink">토론</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">관점이 나뉘는 현안을 골라 의견을 남겨보세요.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-11 pr-11"
          placeholder="현안 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="현안 검색"
        />
        {query ? (
          <button
            type="button"
            aria-label="검색어 지우기"
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 active:scale-95"
            onClick={() => setQuery("")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {loading ? <ShimmerLoader text="토론 현안을 불러오는 중..." /> : null}
      {error ? <ErrorState description={error} onRetry={reload} /> : null}
      {!loading && !error && issues?.length === 0 ? <EmptyState title="등록된 현안이 없습니다" /> : null}
      {!loading && !error && issues && issues.length > 0 && filteredIssues.length === 0 ? (
        <EmptyState title="검색 결과가 없습니다" description="다른 키워드로 다시 검색해 주세요." />
      ) : null}

      <div className="space-y-4">
        {filteredIssues.map((issue, index) => (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={`/issues/${issue.slug}`} className="block overflow-hidden rounded-3xl bg-white shadow-soft transition active:scale-[0.99]">
              <div className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  {issue.hot ? (
                    <Badge className="bg-vote-red/10 text-vote-red">
                      <Flame className="mr-1 h-3 w-3" />
                      핫이슈
                    </Badge>
                  ) : null}
                  <Badge>{formatNumber(issue.views)} 조회</Badge>
                </div>
                <h2 className="text-lg font-black leading-snug text-vote-ink">{issue.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{issue.summary}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs font-black text-slate-400">
                    <UsersRound className="h-4 w-4" />
                    {formatNumber(issue.participants)}명 참여
                  </div>
                  <div className="flex w-32 overflow-hidden rounded-full bg-slate-100">
                    {issue.options.map((option) => (
                      <div key={option.id} className="h-2" style={{ width: `${option.percent}%`, background: option.gradient }} />
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
