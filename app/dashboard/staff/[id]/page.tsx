"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, CreditCard, Pencil, Zap, Target } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency, formatPct, cn } from "@/lib/utils";
import EditStaffModal from "@/components/dashboard/EditStaffModal";

interface WeekStat {
  weekOf: string;
  transactions: number;
  revenue: number;
  repeatRate: number;
  avgTicket: number;
}

interface Visit {
  id: string;
  visitAt: string;
  saleAmount: number;
  isRepeat: boolean;
}

function repeatColor(rate: number) {
  if (rate >= 0.5) return { text: "text-green-400", bg: "text-green-400 bg-green-400/10", hex: "#4ade80" };
  if (rate >= 0.3) return { text: "text-yellow-400", bg: "text-yellow-400 bg-yellow-400/10", hex: "#facc15" };
  return { text: "text-red-400", bg: "text-red-400 bg-red-400/10", hex: "#f87171" };
}

export default function StaffDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [localName, setLocalName] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/staff/${params.id}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data?.staff) {
    return (
      <div className="text-center py-20 text-slate-400">
        Staff member not found.{" "}
        <Link href="/dashboard/staff" className="text-blue-400 hover:underline">Back to staff</Link>
      </div>
    );
  }

  const { staff, weeklyStats, summary, recentVisits, teamAvgRepeatRate, topRepeatRate } = data;
  const displayName = localName?.name ?? staff.displayName;
  const displayRole = localName?.role ?? staff.role;

  const sortedStats: WeekStat[] = [...weeklyStats].sort(
    (a: WeekStat, b: WeekStat) => new Date(a.weekOf).getTime() - new Date(b.weekOf).getTime()
  );

  const repeatTrend =
    sortedStats.length >= 2
      ? sortedStats[sortedStats.length - 1].repeatRate - sortedStats[sortedStats.length - 2].repeatRate
      : null;

  const revenueTrend =
    sortedStats.length >= 2 && sortedStats[sortedStats.length - 2].revenue > 0
      ? (sortedStats[sortedStats.length - 1].revenue - sortedStats[sortedStats.length - 2].revenue) /
        sortedStats[sortedStats.length - 2].revenue
      : null;

  const colors = repeatColor(summary.avgRepeatRate);

  const chartData = sortedStats.map((w) => ({
    week: new Date(w.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    "Repeat rate": Math.round(w.repeatRate * 100),
    Revenue: Math.round(w.revenue),
    Transactions: w.transactions,
  }));

  const latestWeek = sortedStats[sortedStats.length - 1];

  // Revenue opportunity vs top performer
  const topRate = topRepeatRate ?? summary.avgRepeatRate;
  const isTopPerformer = summary.avgRepeatRate >= topRate * 0.98;
  const rateDiff = Math.max(0, topRate - summary.avgRepeatRate);
  const annualRevenueGap = !isTopPerformer && rateDiff > 0.05
    ? Math.round(summary.totalRevenue * rateDiff * 12 / Math.max(1, sortedStats.length / 4))
    : 0;

  // Milestone calculation — what rate do they need to hit team avg?
  const teamAvg = teamAvgRepeatRate ?? null;
  const gapToTeamAvg = teamAvg !== null ? Math.max(0, teamAvg - summary.avgRepeatRate) : null;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/staff" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{displayRole} · {formatCurrency(staff.hourlyRate)}/hr</p>
          </div>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Avg repeat rate</span>
            <Users className={cn("w-5 h-5", colors.text)} />
          </div>
          <div className={cn("text-2xl font-bold tabular-nums", colors.text)}>{formatPct(summary.avgRepeatRate)}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-500 text-xs">{sortedStats.length}wk avg</span>
            {repeatTrend !== null && (
              <span className={cn("flex items-center gap-0.5 text-xs font-medium", repeatTrend >= 0 ? "text-green-400" : "text-red-400")}>
                {repeatTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {repeatTrend >= 0 ? "+" : ""}{(repeatTrend * 100).toFixed(1)}pts
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Total revenue</span>
            <DollarSign className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold tabular-nums">{formatCurrency(summary.totalRevenue)}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-500 text-xs">{sortedStats.length} weeks</span>
            {revenueTrend !== null && (
              <span className={cn("flex items-center gap-0.5 text-xs font-medium", revenueTrend >= 0 ? "text-green-400" : "text-red-400")}>
                {revenueTrend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {revenueTrend >= 0 ? "+" : ""}{(revenueTrend * 100).toFixed(1)}% vs last wk
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Transactions</span>
            <ShoppingCart className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold tabular-nums">{summary.totalTransactions.toLocaleString()}</div>
          <div className="mt-1 text-slate-500 text-xs">
            {sortedStats.length > 0
              ? `~${Math.round(summary.totalTransactions / sortedStats.length)}/week avg`
              : "—"}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">This week</span>
            <CreditCard className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {latestWeek ? formatCurrency(latestWeek.revenue) : "—"}
          </div>
          <div className="mt-1 text-slate-500 text-xs">
            {latestWeek ? `${latestWeek.transactions} transactions` : "No current data"}
          </div>
        </div>
      </div>

      {/* Revenue opportunity banner */}
      {isTopPerformer ? (
        <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-2xl px-5 py-4">
          <Target className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-green-300 text-sm font-semibold">Top performer</p>
            <p className="text-slate-400 text-xs mt-0.5">
              {displayName.split(" ")[0]} has your highest repeat rate. Schedule them on your highest-revenue shifts to maximize return visits.
            </p>
          </div>
          <span className="ml-auto shrink-0 text-green-400 font-bold text-xs bg-green-400/10 border border-green-400/20 px-3 py-1 rounded-full">
            #{1} on your team
          </span>
        </div>
      ) : annualRevenueGap > 0 ? (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl px-5 py-4 flex items-start gap-4">
          <Zap className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-orange-300 text-sm font-semibold mb-1">Revenue opportunity</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              {displayName.split(" ")[0]}&apos;s repeat rate is {(rateDiff * 100).toFixed(0)}pts below your top performer.
              {" "}If they close that gap, the estimated annual revenue impact is{" "}
              <strong className="text-orange-300">{formatCurrency(annualRevenueGap)}/year</strong>.
              {gapToTeamAvg !== null && gapToTeamAvg > 0.01 && (
                <span> Even reaching the team average ({formatPct(teamAvg!)}) would be a meaningful step forward.</span>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold text-orange-400 tabular-nums">{formatCurrency(annualRevenueGap)}</div>
            <div className="text-slate-600 text-xs mt-0.5">est. annual gap</div>
          </div>
        </div>
      ) : null}

      {/* Charts */}
      {chartData.length > 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Repeat rate trend</h2>
              {latestWeek && (
                <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", colors.bg)}>
                  {formatPct(latestWeek.repeatRate)} this week
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#94a3b8" }}
                  formatter={(v: number) => [`${v}%`, "Repeat rate"]}
                />
                <Line
                  type="monotone"
                  dataKey="Repeat rate"
                  stroke={colors.hex}
                  strokeWidth={2}
                  dot={{ fill: colors.hex, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Weekly revenue</h2>
              {latestWeek && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full text-blue-400 bg-blue-400/10">
                  {formatCurrency(latestWeek.revenue)} this week
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#94a3b8" }}
                  formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" fill="url(#revenueGrad)" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weekly breakdown table */}
      {sortedStats.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Weekly breakdown</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 py-3 pl-6 pr-4">Week of</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 py-3">Transactions</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 py-3">Revenue</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 py-3">Avg ticket</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 py-3 pr-6">Repeat rate</th>
                </tr>
              </thead>
              <tbody>
                {[...sortedStats].reverse().map((w, i) => {
                  const isLatest = i === 0;
                  const rc = repeatColor(w.repeatRate);
                  return (
                    <tr key={i} className={cn("border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors", i === sortedStats.length - 1 && "border-0")}>
                      <td className="pl-6 pr-4 py-3 text-slate-300 font-medium">
                        {new Date(w.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {isLatest && (
                          <span className="ml-2 text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full">Current</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-300 tabular-nums">{w.transactions.toLocaleString()}</td>
                      <td className="py-3 text-slate-300 tabular-nums">{formatCurrency(w.revenue)}</td>
                      <td className="py-3 text-slate-300 tabular-nums">{formatCurrency(w.avgTicket)}</td>
                      <td className="py-3 pr-6">
                        <span className={cn("text-xs font-semibold px-2 py-1 rounded-full tabular-nums", rc.bg)}>
                          {formatPct(w.repeatRate)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coaching prompt for underperformers */}
      {summary.avgRepeatRate > 0 && summary.avgRepeatRate < 0.5 && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-orange-300">1:1 coaching guide</h2>
            </div>
            {annualRevenueGap > 0 && (
              <span className="text-xs text-orange-400 font-bold bg-orange-400/10 border border-orange-400/20 px-2 py-1 rounded-full">
                {formatCurrency(annualRevenueGap)}/yr opportunity
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mb-5 leading-relaxed">
            {displayName.split(" ")[0]}&apos;s {formatPct(summary.avgRepeatRate)} repeat rate means most customers aren&apos;t choosing to come back specifically for them.
            {" "}A 10pt improvement would add roughly{" "}
            <strong className="text-slate-200">
              {formatCurrency(Math.round(summary.totalRevenue / Math.max(1, sortedStats.length) * 0.1 * 52))} per year
            </strong>{" "}
            in retained revenue. Use these questions in your next 1:1:
          </p>
          <ol className="space-y-3 mb-5">
            {[
              `"Walk me through how you greet a new customer — what do you say in the first 30 seconds?"`,
              `"Do you remember any regulars by name? What do you know about what they like?"`,
              `"When a customer seems unhappy or hesitant, what do you do? Give me a recent example."`,
              `"What's one thing you could do differently to make sure a customer wants to ask for you next time?"`,
            ].map((q, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-300">
                <span className="text-orange-400 font-bold shrink-0 w-5">{i + 1}.</span>
                <span className="italic text-slate-300">{q}</span>
              </li>
            ))}
          </ol>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-400">What the data says:</strong> The top 3 behaviors that drive repeat rate are (1) recognizing customers by name, (2) making personalized recommendations based on past visits, and (3) recovering from service issues on the spot before the customer leaves.
          </div>
        </div>
      )}

      {/* Recent visits */}
      {recentVisits?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent customer visits</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 py-3 pl-6">Date & time</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 py-3">Sale</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 py-3 pr-6">Customer type</th>
                </tr>
              </thead>
              <tbody>
                {(recentVisits as Visit[]).map((v, i) => (
                  <tr key={v.id} className={cn("border-b border-slate-800/50", i === (recentVisits as Visit[]).length - 1 && "border-0")}>
                    <td className="pl-6 py-3 text-slate-300">
                      {new Date(v.visitAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td className="py-3 text-slate-300 tabular-nums">{formatCurrency(v.saleAmount)}</td>
                    <td className="py-3 pr-6">
                      <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", v.isRepeat ? "text-green-400 bg-green-400/10" : "text-slate-400 bg-slate-700/50")}>
                        {v.isRepeat ? "Repeat customer" : "New customer"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sortedStats.length === 0 && !recentVisits?.length && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
          No performance data yet for this staff member. Sync your POS to see metrics.
        </div>
      )}

      {editing && (
        <EditStaffModal
          staff={{ id: staff.id, name: displayName, role: displayRole }}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setLocalName(updated);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
