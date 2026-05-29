"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, TrendingUp, DollarSign, Users } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency, formatPct, cn } from "@/lib/utils";

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/staff/${id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (!data?.staff) return <div className="text-slate-400 py-20 text-center">Staff member not found.</div>;

  const { staff, weeklyStats, summary } = data;

  const chartData = weeklyStats.map((w: any) => ({
    week: new Date(w.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    repeatRate: Math.round(w.repeatRate * 100),
    revenue: Math.round(w.revenue),
    transactions: w.transactions,
  }));

  function repeatRateColor(rate: number) {
    if (rate >= 0.5) return "text-green-400";
    if (rate >= 0.3) return "text-yellow-400";
    return "text-red-400";
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{staff.displayName}</h1>
          <p className="text-slate-400 text-sm">{staff.role} · ${staff.hourlyRate}/hr</p>
        </div>
        <div className={cn("ml-auto text-2xl font-bold", repeatRateColor(summary.avgRepeatRate))}>
          {formatPct(summary.avgRepeatRate)}
          <div className="text-xs font-normal text-slate-400">avg repeat rate</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total revenue", value: formatCurrency(summary.totalRevenue), icon: <DollarSign className="w-5 h-5 text-blue-400" /> },
          { label: "Total transactions", value: summary.totalTransactions.toLocaleString(), icon: <TrendingUp className="w-5 h-5 text-green-400" /> },
          { label: "Avg repeat rate", value: formatPct(summary.avgRepeatRate), icon: <Users className="w-5 h-5 text-purple-400" /> },
        ].map((c) => (
          <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs uppercase tracking-wide font-medium">{c.label}</span>
              {c.icon}
            </div>
            <div className="text-2xl font-bold">{c.value}</div>
          </div>
        ))}
      </div>

      {/* 8-week trend chart */}
      {chartData.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-semibold mb-5">8-week repeat rate trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }}
                itemStyle={{ color: "#3B82F6" }}
              />
              <Line type="monotone" dataKey="repeatRate" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 4 }} name="Repeat rate %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly stats table */}
      {weeklyStats.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wide px-6 py-3">Week</th>
                <th className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wide py-3">Transactions</th>
                <th className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wide py-3">Revenue</th>
                <th className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wide py-3">Repeat rate</th>
                <th className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wide py-3">Avg ticket</th>
              </tr>
            </thead>
            <tbody>
              {weeklyStats.map((w: any, i: number) => (
                <tr key={w.id} className={cn("border-b border-slate-800/50", i === weeklyStats.length - 1 && "border-0")}>
                  <td className="px-6 py-3 text-slate-300">{new Date(w.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td className="py-3 text-slate-300 tabular-nums">{w.transactions}</td>
                  <td className="py-3 text-slate-300 tabular-nums">{formatCurrency(w.revenue)}</td>
                  <td className="py-3">
                    <span className={cn("text-xs font-semibold tabular-nums", repeatRateColor(w.repeatRate))}>{formatPct(w.repeatRate)}</span>
                  </td>
                  <td className="py-3 text-slate-300 tabular-nums">{formatCurrency(w.avgTicket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
