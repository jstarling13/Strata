"use client";

import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { formatPct, cn } from "@/lib/utils";

const INDUSTRY_BENCHMARKS: Record<string, { repeatRate: number; laborPct: number }> = {
  restaurant: { repeatRate: 0.38, laborPct: 0.30 },
  cafe: { repeatRate: 0.42, laborPct: 0.32 },
  salon: { repeatRate: 0.55, laborPct: 0.35 },
  gym: { repeatRate: 0.70, laborPct: 0.28 },
  retail: { repeatRate: 0.30, laborPct: 0.25 },
  other: { repeatRate: 0.35, laborPct: 0.30 },
};

interface Props {
  orgType: string;
  laborPct: number;
  laborCostTarget: number;
  teamAvgRepeatRate: number;
  prevTeamAvgRepeatRate: number | null;
  overTargetShiftCount?: number;
}

function scoreColor(score: number) {
  if (score >= 80) return { text: "text-green-400", ring: "ring-green-400/30", bg: "bg-green-400", label: "Excellent", labelColor: "text-green-400" };
  if (score >= 60) return { text: "text-blue-400", ring: "ring-blue-400/30", bg: "bg-blue-400", label: "Good", labelColor: "text-blue-400" };
  if (score >= 40) return { text: "text-yellow-400", ring: "ring-yellow-400/30", bg: "bg-yellow-400", label: "Needs work", labelColor: "text-yellow-400" };
  return { text: "text-red-400", ring: "ring-red-400/30", bg: "bg-red-400", label: "Critical", labelColor: "text-red-400" };
}

export default function TeamHealthScore({ orgType, laborPct, laborCostTarget, teamAvgRepeatRate, prevTeamAvgRepeatRate, overTargetShiftCount = 0 }: Props) {
  const bench = INDUSTRY_BENCHMARKS[orgType] || INDUSTRY_BENCHMARKS.other;

  // Repeat rate score (0–40): score based on % of benchmark achieved
  const repeatRatioVsBench = bench.repeatRate > 0 ? teamAvgRepeatRate / bench.repeatRate : 0;
  const repeatScore = Math.min(40, Math.round(repeatRatioVsBench * 40));

  // Labor efficiency score (0–40): perfect at target, decreasing as labor% rises
  const laborRatio = laborCostTarget > 0 ? laborPct / laborCostTarget : 1;
  const laborScore = laborRatio <= 1.0
    ? 40
    : laborRatio <= 1.1
    ? 35
    : laborRatio <= 1.2
    ? 25
    : laborRatio <= 1.5
    ? 15
    : 5;

  // Trend score (0–20): improving = 20, flat = 10, declining = 0–5
  const weekDelta = prevTeamAvgRepeatRate !== null ? teamAvgRepeatRate - prevTeamAvgRepeatRate : null;
  const trendScore =
    weekDelta === null
      ? 10
      : weekDelta >= 0.05
      ? 20
      : weekDelta >= 0.01
      ? 15
      : weekDelta >= -0.01
      ? 10
      : weekDelta >= -0.05
      ? 5
      : 0;

  const total = repeatScore + laborScore + trendScore;
  const colors = scoreColor(total);

  // Breakdown items
  const breakdown = [
    {
      label: "Customer loyalty",
      score: repeatScore,
      max: 40,
      detail: `${formatPct(teamAvgRepeatRate)} vs ${formatPct(bench.repeatRate)} benchmark`,
      good: teamAvgRepeatRate >= bench.repeatRate,
    },
    {
      label: "Labor efficiency",
      score: laborScore,
      max: 40,
      detail: laborPct <= laborCostTarget ? `On target (${formatPct(laborCostTarget)})` : `${formatPct(laborPct - laborCostTarget)} over ${formatPct(laborCostTarget)} target`,
      good: laborPct <= laborCostTarget,
    },
    {
      label: "Week-over-week trend",
      score: trendScore,
      max: 20,
      detail:
        weekDelta === null
          ? "Not enough data yet"
          : weekDelta >= 0.01
          ? `+${(weekDelta * 100).toFixed(1)}pts repeat rate improvement`
          : weekDelta >= -0.01
          ? "Holding steady"
          : `${(weekDelta * 100).toFixed(1)}pts decline this week`,
      good: weekDelta === null || weekDelta >= 0,
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-5 flex items-center gap-5">
        {/* Score circle */}
        <div className={cn("w-20 h-20 rounded-full ring-4 flex flex-col items-center justify-center shrink-0", colors.ring)}>
          <span className={cn("text-2xl font-bold tabular-nums leading-none", colors.text)}>{total}</span>
          <span className="text-slate-500 text-xs mt-0.5">/ 100</span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-lg font-bold", colors.labelColor)}>{colors.label}</span>
            {total >= 80 && <CheckCircle className="w-4 h-4 text-green-400" />}
            {total < 40 && <AlertTriangle className="w-4 h-4 text-red-400" />}
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            {total >= 80
              ? "Your team is performing well across all key metrics."
              : total >= 60
              ? "Good foundation — a few areas can push this higher."
              : total >= 40
              ? "Some gaps are costing you money. Check the breakdown."
              : "Multiple issues need your attention this week."}
          </p>
          {weekDelta !== null && (
            <div className={cn("flex items-center gap-1 text-xs font-medium mt-2", weekDelta >= 0 ? "text-green-400" : "text-red-400")}>
              {weekDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {weekDelta >= 0 ? "Improving" : "Declining"} vs last week
            </div>
          )}
        </div>
      </div>

      {/* Score breakdown */}
      <div className="border-t border-slate-800 divide-y divide-slate-800/60">
        {breakdown.map((item) => (
          <div key={item.label} className="px-5 py-3 flex items-center gap-3">
            <div className="w-5 shrink-0">
              {item.good
                ? <CheckCircle className="w-4 h-4 text-green-400" />
                : <AlertTriangle className="w-4 h-4 text-orange-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-medium text-slate-300">{item.label}</span>
                <span className={cn("text-xs font-bold tabular-nums", item.score >= item.max * 0.8 ? "text-green-400" : item.score >= item.max * 0.5 ? "text-yellow-400" : "text-red-400")}>
                  {item.score}/{item.max}
                </span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", item.score >= item.max * 0.8 ? "bg-green-500" : item.score >= item.max * 0.5 ? "bg-yellow-500" : "bg-red-500")}
                  style={{ width: `${(item.score / item.max) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {overTargetShiftCount > 0 && (
        <div className="border-t border-slate-800 px-5 py-3 flex items-center gap-2 text-xs text-orange-400">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          {overTargetShiftCount} shift{overTargetShiftCount !== 1 ? "s" : ""} running over labor target — check heatmap
        </div>
      )}
    </div>
  );
}
