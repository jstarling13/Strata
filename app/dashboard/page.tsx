"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TrendingUp, Users, DollarSign, Calendar, RefreshCw, Loader2, Sparkles, X, ArrowUpRight, ArrowDownRight, AlertTriangle, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatPct, dayLabel, shiftSlotLabel, cn } from "@/lib/utils";
import StaffTable from "@/components/dashboard/StaffTable";
import ShiftHeatmap from "@/components/dashboard/ShiftHeatmap";
import DigestPanel from "@/components/dashboard/DigestPanel";
import QuickWins from "@/components/dashboard/QuickWins";
import GettingStarted from "@/components/dashboard/GettingStarted";
import ShareInsight from "@/components/dashboard/ShareInsight";
import GoalProgress from "@/components/dashboard/GoalProgress";
import { RepeatRateBenchmark, LaborPctBenchmark } from "@/components/dashboard/BenchmarkBadge";

function DashboardInner() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradeToast, setShowUpgradeToast] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      setShowUpgradeToast(true);
      setTimeout(() => setShowUpgradeToast(false), 6000);
    }
  }, [searchParams]);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data) return null;

  // Empty state — no data synced yet
  if (!data.hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-600/10 flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">Your data is being processed</h2>
        <p className="text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
          We&apos;re analyzing your last 90 days. This usually takes a few minutes for Square/Toast, or a few seconds for CSV.
          Your first digest will be ready shortly.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Check again
          </button>
          <Link href="/onboarding" className="text-sm text-slate-400 hover:text-slate-300 px-5 py-2.5 rounded-xl border border-slate-700 transition-colors">
            Add another data source
          </Link>
        </div>
      </div>
    );
  }

  const { overview, staffStats, shiftPerformance, latestDigest, lastSyncAt, org, allDigests, hasData } = data;

  const repeatTrend = overview.prevTeamAvgRepeatRate !== null
    ? overview.teamAvgRepeatRate - overview.prevTeamAvgRepeatRate
    : null;

  const overviewCards = [
    {
      label: "This week's revenue",
      value: formatCurrency(overview.weeklyRevenue),
      icon: <DollarSign className="w-5 h-5 text-blue-400" />,
      sub: null,
      delta: null,
      alert: false,
    },
    {
      label: "Labor cost %",
      value: formatPct(overview.laborPct),
      icon: <TrendingUp className={cn("w-5 h-5", overview.laborPct > overview.laborCostTarget * 1.1 ? "text-red-400" : "text-green-400")} />,
      sub: `Target: ${formatPct(overview.laborCostTarget)}`,
      delta: null,
      alert: overview.laborPct > overview.laborCostTarget * 1.1,
    },
    {
      label: "Team repeat rate",
      value: formatPct(overview.teamAvgRepeatRate),
      icon: <Users className="w-5 h-5 text-purple-400" />,
      sub: overview.topStaff ? `Best: ${overview.topStaff.name} ${formatPct(overview.topStaff.repeatRate)}` : null,
      delta: repeatTrend,
      alert: false,
    },
    {
      label: "Best shift",
      value: overview.bestShift
        ? `${dayLabel(overview.bestShift.dayOfWeek)} ${shiftSlotLabel(overview.bestShift.shiftSlot).split(" ")[0]}`
        : "—",
      icon: <Calendar className="w-5 h-5 text-green-400" />,
      sub: overview.bestShift ? `${formatPct(overview.bestShift.laborPct)} labor ratio` : null,
      delta: null,
      alert: false,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Upgrade toast */}
      {showUpgradeToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-800 border border-green-500/30 rounded-2xl px-5 py-4 shadow-2xl">
          <Sparkles className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <div className="text-slate-100 font-semibold text-sm">You&apos;re all set.</div>
            <div className="text-slate-400 text-xs">Weekly digests and anomaly alerts are now active.</div>
          </div>
          <button onClick={() => setShowUpgradeToast(false)} className="text-slate-500 hover:text-slate-300 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Getting started checklist */}
      <GettingStarted hasData={!!hasData} hasDigest={!!latestDigest} plan={org.plan} />

      {/* Worst shift warning banner */}
      {overview.worstShift && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl px-5 py-3.5 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-slate-300 text-sm">
            <strong className="text-red-400">{dayLabel(overview.worstShift.dayOfWeek)} {shiftSlotLabel(overview.worstShift.shiftSlot)}</strong>
            {" "}is running at <strong className="text-red-400">{formatPct(overview.worstShift.laborPct)}</strong> labor cost — {Math.round((overview.worstShift.laborPct / overview.laborCostTarget - 1) * 100)}% over your target. See heatmap below.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {lastSyncAt
              ? `Last synced ${new Date(lastSyncAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
              : "No data synced yet"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ShareInsight
            orgName={org.name}
            topStaffName={overview.topStaff?.name}
            topStaffRepeatRate={overview.topStaff?.repeatRate}
            laborPct={overview.laborPct}
            laborCostTarget={overview.laborCostTarget}
          />
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => (
          <div key={card.label} className={cn("bg-slate-900 border rounded-2xl p-5", card.alert ? "border-red-500/40" : "border-slate-800")}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{card.label}</span>
              {card.icon}
            </div>
            <div className={cn("text-2xl font-bold tabular-nums", card.alert && "text-red-400")}>{card.value}</div>
            <div className="flex items-center gap-2 mt-1">
              {card.sub && <div className="text-slate-500 text-xs">{card.sub}</div>}
              {card.delta !== null && (
                <div className={cn("flex items-center gap-0.5 text-xs font-medium", card.delta >= 0 ? "text-green-400" : "text-red-400")}>
                  {card.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {formatPct(Math.abs(card.delta))} vs last week
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Benchmarks row */}
      <div className="flex flex-wrap gap-3">
        <RepeatRateBenchmark orgType={org.type} actual={overview.teamAvgRepeatRate} />
        <LaborPctBenchmark orgType={org.type} actual={overview.laborPct} target={overview.laborCostTarget} />
      </div>

      {/* Quick wins */}
      <QuickWins overview={overview} staffStats={staffStats} latestDigest={latestDigest} />

      {/* Staff table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Staff performance</h2>
          <Link href="/dashboard/staff" className="text-sm text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1">
            View all <LinkIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        <StaffTable staff={staffStats} />
      </div>

      {/* Goal progress + heatmap + digest */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Your goals</h2>
          <GoalProgress
            current={overview.teamAvgRepeatRate}
            prev={overview.prevTeamAvgRepeatRate}
            laborPct={overview.laborPct}
            laborTarget={overview.laborCostTarget}
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Shift profitability heatmap</h2>
          <ShiftHeatmap shifts={shiftPerformance} target={overview.laborCostTarget} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Weekly digest</h2>
            {allDigests?.length > 1 && (
              <Link href="/dashboard/digests" className="text-xs text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1">
                {allDigests.length} weeks <LinkIcon className="w-3 h-3" />
              </Link>
            )}
          </div>
          <DigestPanel digest={latestDigest} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}>
      <DashboardInner />
    </Suspense>
  );
}
