"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, DollarSign, Calendar, ArrowRight, Loader2, Lock, AlertTriangle } from "lucide-react";
import { formatCurrency, formatPct, dayLabel, shiftSlotLabel, cn } from "@/lib/utils";
import StaffTable from "@/components/dashboard/StaffTable";
import ShiftHeatmap from "@/components/dashboard/ShiftHeatmap";
import DemoDigestPanel from "@/components/demo/DemoDigestPanel";
import WeekSummary from "@/components/dashboard/WeekSummary";
import RevenueTrend from "@/components/dashboard/RevenueTrend";
import TeamHealthScore from "@/components/dashboard/TeamHealthScore";
import SchedulingTips from "@/components/dashboard/SchedulingTips";
import StaffLeaderboard from "@/components/dashboard/StaffLeaderboard";
import StaffComparison from "@/components/dashboard/StaffComparison";
import { RepeatRateBenchmark, LaborPctBenchmark } from "@/components/dashboard/BenchmarkBadge";
import Link from "next/link";

export default function DemoPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/demo").then((r) => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) return null;
  const { overview, staffStats, shiftPerformance, latestDigest, revenueTrend } = data;

  const overviewCards = [
    {
      label: "This week's revenue",
      value: formatCurrency(overview.weeklyRevenue),
      icon: <DollarSign className="w-5 h-5 text-blue-400" />,
      sub: null,
    },
    {
      label: "Labor cost %",
      value: formatPct(overview.laborPct),
      icon: <TrendingUp className="w-5 h-5 text-red-400" />,
      sub: `Target: ${formatPct(overview.laborCostTarget)}`,
      alert: true,
    },
    {
      label: "Top repeat rate",
      value: formatPct(overview.topStaff.repeatRate),
      icon: <Users className="w-5 h-5 text-green-400" />,
      sub: overview.topStaff.name,
    },
    {
      label: "Best shift",
      value: `${dayLabel(overview.bestShift.dayOfWeek)} Eve`,
      icon: <Calendar className="w-5 h-5 text-purple-400" />,
      sub: shiftSlotLabel(overview.bestShift.shiftSlot),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Demo banner */}
      <div className="bg-blue-600 text-white text-center py-3 px-6 text-sm font-medium flex items-center justify-center gap-3">
        <span>You&apos;re viewing a live demo — The Corner Table, a real restaurant scenario with 90 days of data.</span>
        <Link href="/sign-up" className="bg-white text-blue-700 font-bold text-xs px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors inline-flex items-center gap-1">
          Connect your data <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 sticky top-0 z-40 bg-slate-950">
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-blue-500 font-bold text-lg">Strata</Link>
            <div className="h-4 w-px bg-slate-800" />
            <span className="text-slate-400 text-sm">The Corner Table</span>
            <div className="flex items-center gap-1">
              {["Overview", "Staff", "Billing"].map((label) => (
                <span key={label} className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium",
                  label === "Overview" ? "bg-slate-800 text-slate-100" : "text-slate-500 cursor-not-allowed"
                )}>
                  {label !== "Overview" && <Lock className="w-3 h-3" />}
                  {label}
                </span>
              ))}
            </div>
          </div>
          <Link href="/sign-up" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Use your own data →
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Overview</h1>
            <p className="text-slate-400 text-sm mt-0.5">Demo data · Week of {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-sm text-blue-300 max-w-xs text-right">
            <strong className="text-blue-200">This is your data, simulated.</strong><br />
            Connect Square in 60 seconds to see your actual numbers.
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card) => (
            <div key={card.label} className={cn(
              "bg-slate-900 border rounded-2xl p-5",
              (card as any).alert ? "border-red-500/40" : "border-slate-800"
            )}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{card.label}</span>
                {card.icon}
              </div>
              <div className={cn("text-2xl font-bold tabular-nums", (card as any).alert && "text-red-400")}>{card.value}</div>
              {card.sub && <div className="text-slate-500 text-xs mt-1">{card.sub}</div>}
            </div>
          ))}
        </div>

        {/* Worst shift warning */}
        {overview.worstShift && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl px-5 py-3.5 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-slate-300 text-sm">
              <strong className="text-red-400">{dayLabel(overview.worstShift.dayOfWeek)} {shiftSlotLabel(overview.worstShift.shiftSlot)}</strong>
              {" "}is running at <strong className="text-red-400">{formatPct(overview.worstShift.laborPct)}</strong> labor cost — {Math.round((overview.worstShift.laborPct / overview.laborCostTarget - 1) * 100)}% over your {formatPct(overview.laborCostTarget)} target.
            </p>
          </div>
        )}

        {/* Week summary */}
        <WeekSummary
          weeklyRevenue={overview.weeklyRevenue}
          prevWeekRevenue={overview.prevWeekRevenue ?? null}
          laborPct={overview.laborPct}
          laborCostTarget={overview.laborCostTarget}
          teamAvgRepeatRate={overview.teamAvgRepeatRate}
          prevTeamAvgRepeatRate={overview.prevTeamAvgRepeatRate ?? null}
        />

        {/* Benchmarks */}
        <div className="flex flex-wrap gap-3">
          <RepeatRateBenchmark orgType="restaurant" actual={overview.teamAvgRepeatRate} />
          <LaborPctBenchmark orgType="restaurant" actual={overview.laborPct} target={overview.laborCostTarget} />
        </div>

        {/* Revenue trend */}
        {revenueTrend?.length >= 2 && <RevenueTrend data={revenueTrend} />}

        {/* Scheduling tips */}
        <SchedulingTips
          shiftPerformance={shiftPerformance}
          staffStats={staffStats}
          laborCostTarget={overview.laborCostTarget}
        />

        {/* Team health + Staff leaderboard */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Team health score</h2>
            <TeamHealthScore
              orgType="restaurant"
              laborPct={overview.laborPct}
              laborCostTarget={overview.laborCostTarget}
              teamAvgRepeatRate={overview.teamAvgRepeatRate}
              prevTeamAvgRepeatRate={overview.prevTeamAvgRepeatRate ?? null}
              overTargetShiftCount={shiftPerformance.filter((s: any) => s.laborPct > overview.laborCostTarget * 1.1).length}
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-4">Staff leaderboard</h2>
            <StaffLeaderboard staff={staffStats} />
          </div>
        </div>

        {/* Staff table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Staff performance</h2>
            <div className="flex items-center gap-3">
              <StaffComparison staff={staffStats} />
              <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">5 staff · last 7 days</span>
            </div>
          </div>
          <StaffTable staff={staffStats} isDemo />
        </div>

        {/* Heatmap + digest */}
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold mb-4">Shift profitability heatmap</h2>
            <ShiftHeatmap shifts={shiftPerformance} target={overview.laborCostTarget} />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-4">Weekly AI digest</h2>
            <DemoDigestPanel digest={latestDigest} />
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/5 border border-blue-500/20 rounded-2xl p-8 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">Ready to see your actual numbers?</h3>
            <p className="text-slate-400 text-sm">Connect Square in 60 seconds. Your first real digest in 24 hours.</p>
          </div>
          <Link href="/sign-up" className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors inline-flex items-center gap-2">
            Start free trial <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
