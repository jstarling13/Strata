"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Award, Zap } from "lucide-react";
import { formatCurrency, formatPct, cn } from "@/lib/utils";

interface StaffRow {
  id: string;
  name: string;
  role: string;
  repeatRate: number;
  revenue: number;
  transactions: number;
  prevRepeatRate?: number | null;
}

const MEDAL: Record<number, { icon: string; color: string; bg: string }> = {
  0: { icon: "🥇", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  1: { icon: "🥈", color: "text-slate-300", bg: "bg-slate-700/50 border-slate-600/30" },
  2: { icon: "🥉", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
};

export default function StaffLeaderboard({ staff }: { staff: StaffRow[] }) {
  if (staff.length === 0) return null;

  const sorted = [...staff].sort((a, b) => b.repeatRate - a.repeatRate);
  const maxRate = sorted[0].repeatRate;

  // Find "rising star" — biggest improvement
  const risingStar = staff
    .filter((s) => s.prevRepeatRate != null && s.repeatRate - s.prevRepeatRate! > 0.03)
    .sort((a, b) => (b.repeatRate - b.prevRepeatRate!) - (a.repeatRate - a.prevRepeatRate!))[0];

  // Find needs coaching
  const needsCoaching = staff
    .filter((s) => s.prevRepeatRate != null && s.repeatRate - s.prevRepeatRate! < -0.05)
    .sort((a, b) => (a.repeatRate - a.prevRepeatRate!) - (b.repeatRate - b.prevRepeatRate!))[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-yellow-400" />
          <h3 className="font-semibold text-sm">Repeat rate leaderboard</h3>
        </div>
        <span className="text-xs text-slate-500">This week</span>
      </div>

      <div className="p-4 space-y-2">
        {sorted.map((s, i) => {
          const medal = MEDAL[i];
          const barWidth = maxRate > 0 ? (s.repeatRate / maxRate) * 100 : 0;
          const delta = s.prevRepeatRate != null ? s.repeatRate - s.prevRepeatRate : null;
          const isRising = risingStar?.id === s.id;
          const needsHelp = needsCoaching?.id === s.id;

          return (
            <Link
              key={s.id}
              href={`/dashboard/staff/${s.id}`}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] hover:border-slate-600",
                medal ? `${medal.bg} border` : "bg-slate-800/40 border-slate-800"
              )}
            >
              {/* Rank */}
              <div className="w-8 text-center shrink-0">
                {medal ? (
                  <span className="text-lg leading-none">{medal.icon}</span>
                ) : (
                  <span className="text-slate-500 text-sm font-semibold">#{i + 1}</span>
                )}
              </div>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-100 truncate">{s.name}</span>
                  {isRising && (
                    <span className="shrink-0 flex items-center gap-0.5 text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full font-semibold">
                      <Zap className="w-2.5 h-2.5" />
                      Rising
                    </span>
                  )}
                  {needsHelp && (
                    <span className="shrink-0 text-xs text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full font-semibold">
                      Coach
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", medal ? medal.color.replace("text-", "bg-") : "bg-slate-500")}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="text-right shrink-0">
                <div className={cn("text-sm font-bold tabular-nums", medal ? medal.color : "text-slate-300")}>
                  {formatPct(s.repeatRate)}
                </div>
                {delta !== null && (
                  <div className={cn("text-xs flex items-center justify-end gap-0.5 tabular-nums", delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-slate-500")}>
                    {delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : delta < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                    {delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)}pts
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-slate-800 text-xs text-slate-600">
        Click any name to view their 8-week trend
      </div>
    </div>
  );
}
