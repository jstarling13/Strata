"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface WeekRevenue {
  weekOf: string;
  revenue: number;
}

export default function RevenueTrend({ data }: { data: WeekRevenue[] }) {
  if (!data || data.length < 2) return null;

  const chartData = data.map((d) => ({
    week: new Date(d.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Revenue: Math.round(d.revenue),
  }));

  const latest = data[data.length - 1].revenue;
  const prior = data[data.length - 2].revenue;
  const delta = prior > 0 ? (latest - prior) / prior : 0;
  const deltaAmt = latest - prior;
  const isUp = delta >= 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-300">Revenue trend</h3>
        <div className={cn("flex items-center gap-1 text-xs font-semibold", isUp ? "text-green-400" : "text-red-400")}>
          {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {isUp ? "+" : ""}{(delta * 100).toFixed(1)}% vs last week
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {isUp
          ? `Up ${formatCurrency(Math.abs(deltaAmt))} from last week`
          : `Down ${formatCurrency(Math.abs(deltaAmt))} from last week`}
      </p>

      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0.2} />
              <stop offset="95%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(v: number) => [formatCurrency(v), "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="Revenue"
            stroke={isUp ? "#22c55e" : "#ef4444"}
            fill="url(#revGrad)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex justify-between mt-2">
        {data.map((d, i) => (
          <div key={i} className="text-center">
            <div className={cn("text-xs font-semibold tabular-nums", i === data.length - 1 ? "text-slate-100" : "text-slate-500")}>
              {formatCurrency(d.revenue)}
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {new Date(d.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
