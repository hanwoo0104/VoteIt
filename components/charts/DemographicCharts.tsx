"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IssueStatistics } from "@/types";

const COLORS = ["#2d5a88", "#e4233f", "#2b7b67", "#6956c8", "#f59e0b", "#64748b"];

function MiniTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-semibold shadow-soft">
      {label ? <span className="mr-2 text-slate-500">{label}</span> : null}
      <span className="text-vote-ink">{payload[0].value}%</span>
    </div>
  );
}

export function DemographicCharts({ statistics }: { statistics: IssueStatistics }) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-black text-vote-ink">연령대별 선택 비율</h3>
          <span className="text-xs font-bold text-slate-400">%</span>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statistics.age} barSize={18}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis hide domain={[0, 70]} />
              <Tooltip content={<MiniTooltip />} cursor={{ fill: "rgba(47,82,119,0.06)" }} />
              <Bar dataKey="value" radius={[10, 10, 10, 10]}>
                {statistics.age.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PieBlock title="성별" data={statistics.gender} />
        <PieBlock title="소득" data={statistics.income} />
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-soft">
        <h3 className="mb-4 text-base font-black text-vote-ink">지역별 선택 비율</h3>
        <div className="space-y-3">
          {statistics.region.map((point, index) => (
            <div key={point.label}>
              <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{point.label}</span>
                <span>{point.value}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${point.value}%`, backgroundColor: COLORS[index % COLORS.length] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PieBlock({ title, data }: { title: string; data: IssueStatistics["gender"] }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-soft">
      <h3 className="text-base font-black text-vote-ink">{title} 선택 비율</h3>
      <div className="mt-2 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<MiniTooltip />} />
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={42} outerRadius={68} paddingAngle={4}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.map((item, index) => (
          <span key={item.label} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
