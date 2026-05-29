"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, BarChart2, Download } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { formatCurrency, formatPct, cn } from "@/lib/utils";
import CustomerRetention from "@/components/dashboard/CustomerRetention";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  async function exportReport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export/report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `strata-report-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const { revenueTrend, staffStats, overview, org } = data || {};

  const revenueChartData = (revenueTrend || []).map((r: any) => ({
    week: new Date(r.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Revenue: Math.round(r.revenue),
  }));

  const latestRevenue = revenueTrend?.[revenueTrend.length - 1]?.revenue ?? 0;
  const prevRevenue = revenueTrend?.[revenueTrend.length - 2]?.revenue ?? 0;
  const revenueChange = prevRevenue > 0 ? (latestRevenue - prevRevenue) / prevRevenue : 0;

  return (
    <div className="space-y-10 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-slate-400 text-sm mt-0.5">Deep-dive into your business performance over time.</p>
        </div>
        <button
          onClick={exportReport}
          disabled={exporting || !data}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          {exporting ? "Exporting…" : "Export report"}
        </button>
      </div>

      {/* Revenue trend */}
      {revenueChartData.length > 1 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Revenue trend</h2>
            <div className={cn("flex items-center gap-1 text-sm font-semibold", revenueChange >= 0 ? "text-green-400" : "text-red-400")}>
              {revenueChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {revenueChange >= 0 ? "+" : ""}{(revenueChange * 100).toFixed(1)}% vs last week
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                <defs>
                  <linearGradient id="revGradAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={revenueChange >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={revenueChange >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke={revenueChange >= 0 ? "#22c55e" : "#ef4444"}
                  fill="url(#revGradAnalytics)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: revenueChange >= 0 ? "#22c55e" : "#ef4444" }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Staff repeat rate comparison */}
      {staffStats?.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Staff repeat rate comparison</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="space-y-3">
              {[...staffStats]
                .sort((a: any, b: any) => b.repeatRate - a.repeatRate)
                .map((s: any) => {
                  const max = staffStats[0]?.repeatRate || 1;
                  const barW = Math.min(100, (s.repeatRate / (overview?.teamAvgRepeatRate * 2 || 1)) * 100);
                  const color = s.repeatRate >= 0.5 ? "bg-green-500" : s.repeatRate >= 0.3 ? "bg-yellow-500" : "bg-red-500";
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-28 shrink-0 text-sm text-slate-300 truncate">{s.name}</div>
                      <div className="flex-1 h-6 bg-slate-800 rounded-lg overflow-hidden relative">
                        <div
                          className={cn("h-full rounded-lg transition-all duration-500", color)}
                          style={{ width: `${barW}%` }}
                        />
                        <span className="absolute inset-0 flex items-center pl-2 text-xs font-semibold text-white/80">
                          {formatPct(s.repeatRate)}
                        </span>
                      </div>
                      <div className="w-20 shrink-0 text-right">
                        <span className="text-xs text-slate-500">{formatCurrency(s.revenue)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
            {overview?.teamAvgRepeatRate > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                <div className="h-px flex-1 border-t border-dashed border-slate-600" />
                <span className="text-xs text-slate-500">Team avg: {formatPct(overview.teamAvgRepeatRate)}</span>
                <div className="h-px flex-1 border-t border-dashed border-slate-600" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Customer retention section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Customer retention</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <BarChart2 className="w-3.5 h-3.5" />
            Last 8 weeks
          </div>
        </div>
        <CustomerRetention />
      </section>

      {/* Labor cost breakdown */}
      {overview && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Labor cost snapshot</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-3xl font-bold tabular-nums">{formatPct(overview.laborPct)}</div>
                <div className="text-slate-400 text-sm mt-0.5">This week's labor cost %</div>
              </div>
              <div className={cn("text-right", overview.laborPct <= overview.laborCostTarget ? "text-green-400" : "text-red-400")}>
                <div className="text-xl font-bold tabular-nums">{formatPct(overview.laborCostTarget)}</div>
                <div className="text-xs text-slate-500 mt-0.5">Your target</div>
              </div>
            </div>

            {/* Visual gauge */}
            <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mb-2">
              {/* Target marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-10"
                style={{ left: `${Math.min(100, (overview.laborCostTarget / (overview.laborCostTarget * 1.8)) * 100)}%` }}
              />
              <div
                className={cn("h-full rounded-full transition-all duration-700", overview.laborPct <= overview.laborCostTarget ? "bg-green-500" : "bg-red-500")}
                style={{ width: `${Math.min(100, (overview.laborPct / (overview.laborCostTarget * 1.8)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>0%</span>
              <span className="text-slate-500">Target: {formatPct(overview.laborCostTarget)}</span>
              <span>{formatPct(overview.laborCostTarget * 1.8)}</span>
            </div>

            {overview.laborPct > overview.laborCostTarget && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-300">
                Over by {formatPct(overview.laborPct - overview.laborCostTarget)} — check the shift heatmap on your dashboard to see which shifts are driving this.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
