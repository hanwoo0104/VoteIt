"use client";

import Link from "next/link";
import { Flame, Search, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { issues } from "@/services/data/mockData";
import { formatNumber } from "@/lib/utils";

export function IssueListScreen() {
  return (
    <AppShell className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-vote-ink">토론</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">관점이 나뉘는 현안을 골라 의견을 남겨보세요.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-11" placeholder="현안 검색" />
      </div>
      <div className="space-y-4">
        {issues.map((issue, index) => (
          <motion.div
            key={issue.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={`/issues/${issue.id}`} className="block overflow-hidden rounded-3xl bg-white shadow-soft transition active:scale-[0.99]">
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
