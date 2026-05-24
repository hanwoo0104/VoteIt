"use client";

import { useEffect, useState } from "react";
import { Bot, Check, MinusCircle, Sparkles, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { analysisLoadingSteps, getMockAnalysis } from "@/services/ai/mockAnalysis";
import type { AIAnalysis } from "@/types";

export function AnalysisPanel({ issueId, optionId }: { issueId: string; optionId: string }) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    setAnalysis(null);
    setStepIndex(0);

    const stepTimer = window.setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, analysisLoadingSteps.length - 1));
    }, 520);

    getMockAnalysis(issueId, optionId)
      .then((result) => {
        if (mounted) setAnalysis(result);
      })
      .finally(() => window.clearInterval(stepTimer));

    return () => {
      mounted = false;
      window.clearInterval(stepTimer);
    };
  }, [issueId, optionId]);

  if (!analysis) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-white p-5 shadow-soft"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-vote-ink text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-vote-ink">VoteIt AI 분석</p>
            <p className="text-xs font-semibold text-slate-400">데모 분석 엔진</p>
          </div>
        </div>
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="shimmer-line animate-shimmer text-[15px] font-black">{analysisLoadingSteps[stepIndex]}</p>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-11/12 rounded-full bg-slate-200" />
            <div className="h-3 w-8/12 rounded-full bg-slate-200" />
            <div className="h-3 w-10/12 rounded-full bg-slate-200" />
          </div>
        </div>
      </motion.section>
    );
  }

  const lines = [
    { icon: Sparkles, title: "가까운 정치 성향", body: analysis.alignment },
    { icon: UsersRound, title: "다른 의견과의 차이", body: analysis.difference }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl bg-white shadow-soft"
    >
      <div className="bg-vote-ink p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-black">AI 의견 분석 결과</p>
            <p className="text-xs font-semibold text-white/58">ChatGPT 스타일 데모 출력</p>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        {lines.map((line, index) => {
          const Icon = line.icon;
          return (
            <motion.div
              key={line.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.14 }}
              className="rounded-3xl bg-slate-50 p-4"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-vote-ink">
                <Icon className="h-4 w-4 text-vote-red" />
                {line.title}
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{line.body}</p>
            </motion.div>
          );
        })}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} className="grid gap-3">
          <InsightList title="장점" items={analysis.pros} positive />
          <InsightList title="단점" items={analysis.cons} />
          <InsightList title="관련 정치인 발언 흐름" items={analysis.politicianNotes} positive />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-3xl bg-vote-red/8 p-4 text-sm font-medium leading-relaxed text-vote-ink"
        >
          {analysis.closing}
        </motion.p>
      </div>
    </motion.section>
  );
}

function InsightList({ title, items, positive = false }: { title: string; items: string[]; positive?: boolean }) {
  return (
    <div className="rounded-3xl border border-slate-100 p-4">
      <p className="mb-3 text-sm font-black text-vote-ink">{title}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.32 + index * 0.08 }}
            className="flex gap-2 text-sm leading-relaxed text-slate-600"
          >
            {positive ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-vote-red" />
            )}
            <span>{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
