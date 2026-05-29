"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency, formatPct, cn } from "@/lib/utils";

interface Props {
  weeklyRevenue: number;
  prevWeekRevenue: number | null;
  laborPct: number;
  laborCostTarget: number;
  teamAvgRepeatRate: number;
  prevTeamAvgRepeatRate: number | null;
}

function Delta({ current, prev, format, invert = false }: {
  current: number;
  prev: number | null;
  format: (v: number) => string;
  invert?: boolean;
}) {
  if (prev === null || prev === 0) return null;
  const delta = current - prev;
  const pct = (delta / Math.abs(prev)) * 100;
  const isGood = invert ? delta <= 0 : delta >= 0;
  const icon = delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : delta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />;

  return (
    <div className={cn("flex items-center gap-1 text-xs font-medium tabular-nums", delta === 0 ? "text-slate-500" : isGood ? "text-green-400" : "text-red-400")}>
      {icon}
      {delta >= 0 ? "+" : ""}{pct.toFixed(1)}% ({format(Math.abs(delta))}) vs last wk
    </div>
  );
}

export default function WeekSummary({ weeklyRevenue, prevWeekRevenue, laborPct, laborCostTarget, teamAvgRepeatRate, prevTeamAvgRepeatRate }: Props) {
  const hasComparison = prevWeekRevenue !== null || prevTeamAvgRepeatRate !== null;
  if (!hasComparison) return null;

  const revenueChange = prevWeekRevenue ? weeklyRevenue - prevWeekRevenue : null;
  const revenueIsUp = revenueChange !== null && revenueChange >= 0;
  const laborOnTarget = laborPct <= laborCostTarget * 1.05;
  const repeatDelta = prevTeamAvgRepeatRate !== null ? teamAvgRepeatRate - prevTeamAvgRepeatRate : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
        {/* Revenue */}
        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Revenue this week</div>
          <div className="text-xl font-bold tabular-nums mb-1">{formatCurrency(weeklyRevenue)}</div>
          {prevWeekRevenue !== null && (
            <Delta
              current={weeklyRevenue}
              prev={prevWeekRevenue}
              format={(v) => formatCurrency(v)}
            />
          )}
        </div>

        {/* Repeat rate */}
        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Team repeat rate</div>
          <div className={cn("text-xl font-bold tabular-nums mb-1",
            teamAvgRepeatRate >= 0.5 ? "text-green-400" :
            teamAvgRepeatRate >= 0.3 ? "text-yellow-400" : "text-red-400"
          )}>
            {formatPct(teamAvgRepeatRate)}
          </div>
          {repeatDelta !== null && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", repeatDelta >= 0 ? "text-green-400" : "text-red-400")}>
              {repeatDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {repeatDelta >= 0 ? "+" : ""}{(repeatDelta * 100).toFixed(1)}pts vs last week
            </div>
          )}
        </div>

        {/* Labor */}
        <div className="px-5 py-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Labor cost</div>
          <div className={cn("text-xl font-bold tabular-nums mb-1", laborOnTarget ? "text-green-400" : "text-red-400")}>
            {formatPct(laborPct)}
          </div>
          <div className={cn("text-xs font-medium flex items-center gap-1", laborOnTarget ? "text-green-400" : "text-red-400")}>
            {laborOnTarget
              ? <><TrendingDown className="w-3.5 h-3.5" />On target ({formatPct(laborCostTarget)})</>
              : <><TrendingUp className="w-3.5 h-3.5" />{formatPct(laborPct - laborCostTarget)} over target</>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
