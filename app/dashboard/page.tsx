"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, DollarSign, Calendar, RefreshCw, Loader2 } from "lucide-react";
import { formatCurrency, formatPct, dayLabel, shiftSlotLabel, cn } from "@/lib/utils";
import StaffTable from "@/components/dashboard/StaffTable";
import ShiftHeatmap from "@/components/dashboard/ShiftHeatmap";
import DigestPanel from "@/components/dashboard/DigestPanel";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const { overview, staffStats, shiftPerformance, latestDigest, lastSyncAt } = data;

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
      icon: <TrendingUp className="w-5 h-5 text-yellow-400" />,
      sub: `Target: ${formatPct(overview.laborCostTarget)}`,
      alert: overview.laborPct > overview.laborCostTarget * 1.2,
    },
    {
      label: "Top repeat rate",
      value: overview.topStaff ? formatPct(overview.topStaff.repeatRate) : "—",
      icon: <Users className="w-5 h-5 text-green-400" />,
      sub: overview.topStaff?.name,
    },
    {
      label: "Best shift",
      value: overview.bestShift
        ? `${dayLabel(overview.bestShift.dayOfWeek)} ${["AM","L","PM","EVE"][["morning","lunch","afternoon","evening"].indexOf(overview.bestShift.shiftSlot)]}`
        : "—",
      icon: <Calendar className="w-5 h-5 text-purple-400" />,
      sub: overview.bestShift ? shiftSlotLabel(overview.bestShift.shiftSlot) : null,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {lastSyncAt
              ? `Last synced ${new Date(lastSyncAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
              : "No data synced yet"}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => (
          <div key={card.label} className={cn("bg-slate-900 border rounded-2xl p-5", (card as any).alert ? "border-red-500/40" : "border-slate-800")}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">{card.label}</span>
              {card.icon}
            </div>
            <div className={cn("text-2xl font-bold tabular-nums", (card as any).alert && "text-red-400")}>{card.value}</div>
            {card.sub && <div className="text-slate-500 text-xs mt-1">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Staff table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Staff performance</h2>
        <StaffTable staff={staffStats} />
      </div>

      {/* Heatmap + digest side by side */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">Shift profitability heatmap</h2>
          <ShiftHeatmap shifts={shiftPerformance} target={overview.laborCostTarget} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Weekly digest</h2>
          <DigestPanel digest={latestDigest} />
        </div>
      </div>
    </div>
  );
}
