"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Loader2 } from "lucide-react";
import { formatCurrency, formatPct, cn } from "@/lib/utils";

interface WeekData {
  weekOf: string;
  newCount: number;
  repeatCount: number;
  total: number;
  repeatRate: number;
  newRevenue: number;
  repeatRevenue: number;
  totalRevenue: number;
}

interface Summary {
  totalVisits: number;
  repeatVisits: number;
  overallRepeatRate: number;
  totalRevenue: number;
  repeatRevenue: number;
  repeatRevenuePct: number;
}

export default function CustomerRetention() {
  const [data, setData] = useState<{ weeks: WeekData[]; summary: Summary } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/retention")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data || data.weeks.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
        <Users className="w-8 h-8 mx-auto mb-3 text-slate-700" />
        <p className="text-sm font-medium">No retention data yet</p>
        <p className="text-xs mt-1">Sync your POS to see customer return patterns.</p>
      </div>
    );
  }

  const { weeks, summary } = data;
  const latestWeek = weeks[weeks.length - 1];
  const prevWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
  const repeatTrend = prevWeek ? latestWeek.repeatRate - prevWeek.repeatRate : null;

  const chartData = weeks.map((w) => ({
    week: new Date(w.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    "New customers": w.newCount,
    "Repeat customers": w.repeatCount,
    "Repeat rate": Math.round(w.repeatRate * 100),
    repeatRevenue: w.repeatRevenue,
    newRevenue: w.newRevenue,
  }));

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Overall repeat rate</div>
          <div className={cn("text-xl font-bold tabular-nums",
            summary.overallRepeatRate >= 0.5 ? "text-green-400" :
            summary.overallRepeatRate >= 0.3 ? "text-yellow-400" : "text-red-400"
          )}>
            {formatPct(summary.overallRepeatRate)}
          </div>
          {repeatTrend !== null && (
            <div className={cn("flex items-center gap-1 text-xs mt-1 font-medium", repeatTrend >= 0 ? "text-green-400" : "text-red-400")}>
              {repeatTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {repeatTrend >= 0 ? "+" : ""}{(repeatTrend * 100).toFixed(1)}pts this week
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Repeat revenue %</div>
          <div className="text-xl font-bold tabular-nums text-blue-400">{formatPct(summary.repeatRevenuePct)}</div>
          <div className="text-xs text-slate-500 mt-1">{formatCurrency(summary.repeatRevenue)} repeat</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Total visits (8wk)</div>
          <div className="text-xl font-bold tabular-nums">{summary.totalVisits.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.repeatVisits.toLocaleString()} repeat</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">This week rate</div>
          <div className={cn("text-xl font-bold tabular-nums",
            latestWeek.repeatRate >= 0.5 ? "text-green-400" :
            latestWeek.repeatRate >= 0.3 ? "text-yellow-400" : "text-red-400"
          )}>
            {formatPct(latestWeek.repeatRate)}
          </div>
          <div className="text-xs text-slate-500 mt-1">{latestWeek.repeatCount} of {latestWeek.total} visits</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold mb-5">New vs repeat customers by week</h3>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="count" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="rate" orientation="right" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#94a3b8" }}
              formatter={(value: number, name: string) => {
                if (name === "Repeat rate") return [`${value}%`, name];
                return [value.toLocaleString(), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "#94a3b8" }} />
            <Bar yAxisId="count" dataKey="New customers" stackId="a" fill="#334155" radius={[0, 0, 2, 2]} />
            <Bar yAxisId="count" dataKey="Repeat customers" stackId="a" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            <Line yAxisId="rate" type="monotone" dataKey="Repeat rate" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-600 mt-2">
          Blue bars = repeat customers · Gray bars = new customers · Green line = repeat rate %
        </p>
      </div>
    </div>
  );
}
