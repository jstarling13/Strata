"use client";

import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { formatCurrency, formatPct, cn } from "@/lib/utils";

interface Props {
  weeklyRevenue: number;
  prevWeekRevenue: number | null;
  laborPct: number;
  laborCostTarget: number;
  teamAvgRepeatRate: number;
  prevTeamAvgRepeatRate: number | null;
  topStaffName?: string;
  worstShiftDay?: string;
  worstShiftSlot?: string;
}

export default function SmartSummary({
  weeklyRevenue,
  prevWeekRevenue,
  laborPct,
  laborCostTarget,
  teamAvgRepeatRate,
  prevTeamAvgRepeatRate,
  topStaffName,
  worstShiftDay,
  worstShiftSlot,
}: Props) {
  const revenueDelta = prevWeekRevenue !== null ? weeklyRevenue - prevWeekRevenue : null;
  const revenuePct = prevWeekRevenue && prevWeekRevenue > 0 ? revenueDelta! / prevWeekRevenue : null;
  const repeatDelta = prevTeamAvgRepeatRate !== null ? teamAvgRepeatRate - prevTeamAvgRepeatRate : null;

  const laborOver = laborPct > laborCostTarget * 1.05;
  const laborFar = laborPct > laborCostTarget * 1.2;

  // Build the most important sentence
  let headline = "";
  let icon: React.ReactNode;
  let sentiment: "positive" | "warning" | "neutral" = "neutral";

  if (revenuePct !== null && revenuePct > 0.05) {
    headline = `Revenue is up ${(revenuePct * 100).toFixed(0)}% vs last week (${formatCurrency(weeklyRevenue)}).`;
    sentiment = "positive";
    icon = <TrendingUp className="w-4 h-4" />;
  } else if (revenuePct !== null && revenuePct < -0.05) {
    headline = `Revenue is down ${Math.abs(Math.round(revenuePct * 100))}% vs last week.`;
    sentiment = "warning";
    icon = <TrendingDown className="w-4 h-4" />;
  } else if (laborFar) {
    const overBy = Math.round((laborPct - laborCostTarget) * 100);
    headline = `Labor cost is ${overBy}pts above target — your biggest opportunity this week.`;
    sentiment = "warning";
    icon = <Zap className="w-4 h-4" />;
  } else if (repeatDelta !== null && repeatDelta > 0.02) {
    headline = `Team repeat rate improved ${(repeatDelta * 100).toFixed(1)}pts vs last week — keep the momentum.`;
    sentiment = "positive";
    icon = <TrendingUp className="w-4 h-4" />;
  } else if (repeatDelta !== null && repeatDelta < -0.03) {
    headline = `Team repeat rate dropped ${Math.abs(repeatDelta * 100).toFixed(1)}pts this week — check staff schedule changes.`;
    sentiment = "warning";
    icon = <TrendingDown className="w-4 h-4" />;
  } else {
    headline = `${formatCurrency(weeklyRevenue)} in revenue this week · ${formatPct(laborPct)} labor cost · ${formatPct(teamAvgRepeatRate)} team repeat rate.`;
    sentiment = "neutral";
    icon = <Minus className="w-4 h-4" />;
  }

  // Add context suffix
  let suffix = "";
  if (topStaffName && sentiment === "positive") {
    suffix = ` ${topStaffName} is your top performer.`;
  } else if (worstShiftDay && worstShiftSlot && laborOver) {
    suffix = ` Focus on ${worstShiftDay} ${worstShiftSlot} — it's your highest-cost shift.`;
  }

  const colorMap = {
    positive: "bg-green-500/5 border-green-500/20 text-green-300",
    warning: "bg-amber-500/5 border-amber-500/20 text-amber-300",
    neutral: "bg-slate-800/60 border-slate-700 text-slate-300",
  };

  const iconMap = {
    positive: "text-green-400",
    warning: "text-amber-400",
    neutral: "text-slate-400",
  };

  return (
    <div className={cn("border rounded-xl px-4 py-3 flex items-center gap-3 text-sm", colorMap[sentiment])}>
      <span className={cn("shrink-0", iconMap[sentiment])}>{icon}</span>
      <p className="leading-relaxed">
        <strong className="font-semibold">{headline}</strong>
        {suffix && <span className="opacity-80">{suffix}</span>}
      </p>
    </div>
  );
}
