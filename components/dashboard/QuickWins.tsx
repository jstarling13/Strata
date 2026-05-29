"use client";

import { CheckCircle, TrendingDown, Users, BarChart3, ArrowRight } from "lucide-react";
import { formatPct, dayLabel, shiftSlotLabel, cn } from "@/lib/utils";

interface Props {
  overview: {
    weeklyRevenue: number;
    laborPct: number;
    laborCostTarget: number;
    teamAvgRepeatRate: number;
    topStaff: { name: string; repeatRate: number } | null;
    bestShift: { dayOfWeek: number; shiftSlot: string; laborPct: number } | null;
    worstShift: { dayOfWeek: number; shiftSlot: string; laborPct: number } | null;
  };
  staffStats: Array<{
    id: string;
    name: string;
    repeatRate: number;
    prevRepeatRate?: number | null;
    transactions: number;
  }>;
  latestDigest: { insightsJson: Array<{ title: string; body: string; action?: string; type: string }> } | null;
}

interface Win {
  icon: React.ReactNode;
  color: string;
  label: string;
  title: string;
  action: string;
  priority: "high" | "medium" | "low";
}

function priorityLabel(p: Win["priority"]) {
  if (p === "high") return { text: "Do today", cls: "text-red-400 bg-red-400/10" };
  if (p === "medium") return { text: "This week", cls: "text-amber-400 bg-amber-400/10" };
  return { text: "When possible", cls: "text-slate-400 bg-slate-800" };
}

export default function QuickWins({ overview, staffStats, latestDigest }: Props) {
  const wins: Win[] = [];

  // 1. Worst shift is way over target → schedule fix
  if (overview.worstShift) {
    const overBy = overview.worstShift.laborPct - overview.laborCostTarget;
    const pctOver = Math.round((overBy / overview.laborCostTarget) * 100);
    wins.push({
      icon: <BarChart3 className="w-4 h-4" />,
      color: "text-red-400",
      label: "Costly shift",
      title: `${dayLabel(overview.worstShift.dayOfWeek)} ${shiftSlotLabel(overview.worstShift.shiftSlot)} is ${pctOver}% over your labor target`,
      action: `Review staffing for ${dayLabel(overview.worstShift.dayOfWeek)} ${shiftSlotLabel(overview.worstShift.shiftSlot)}. Consider cutting one shift or moving a part-timer to a higher-revenue slot.`,
      priority: pctOver > 50 ? "high" : "medium",
    });
  }

  // 2. Largest repeat rate drop vs last week
  const droppedStaff = staffStats
    .filter((s) => s.prevRepeatRate != null && s.repeatRate - s.prevRepeatRate! < -0.05)
    .sort((a, b) => (a.repeatRate - a.prevRepeatRate!) - (b.repeatRate - b.prevRepeatRate!));

  if (droppedStaff.length > 0) {
    const s = droppedStaff[0];
    const drop = Math.abs(Math.round((s.repeatRate - s.prevRepeatRate!) * 100));
    wins.push({
      icon: <Users className="w-4 h-4" />,
      color: "text-orange-400",
      label: "Repeat rate drop",
      title: `${s.name}'s repeat rate dropped ${drop}pts this week`,
      action: `Talk to ${s.name} today. A drop this size usually signals something specific — a bad shift, a customer complaint, or a schedule change. Ask what happened.`,
      priority: "high",
    });
  }

  // 3. Labor cost over target overall
  if (overview.laborPct > overview.laborCostTarget * 1.05 && !overview.worstShift) {
    const over = formatPct(overview.laborPct - overview.laborCostTarget);
    wins.push({
      icon: <TrendingDown className="w-4 h-4" />,
      color: "text-amber-400",
      label: "Labor over target",
      title: `Overall labor cost is ${over} above your ${formatPct(overview.laborCostTarget)} target`,
      action: "Check the heatmap below for which specific shifts are pulling your labor % up. Focus reduction efforts there first.",
      priority: "medium",
    });
  }

  // 4. Top performer isn't staffed on best shift
  if (overview.topStaff && overview.bestShift) {
    wins.push({
      icon: <CheckCircle className="w-4 h-4" />,
      color: "text-green-400",
      label: "Scheduling opportunity",
      title: `${overview.topStaff.name} has the highest repeat rate at ${formatPct(overview.topStaff.repeatRate)}`,
      action: `Make sure ${overview.topStaff.name} is scheduled during your busiest shifts, especially ${dayLabel(overview.bestShift.dayOfWeek)} ${shiftSlotLabel(overview.bestShift.shiftSlot)} where revenue is highest.`,
      priority: "medium",
    });
  }

  // 5. Pull top action from latest digest if we have room
  if (wins.length < 3 && latestDigest) {
    const insights = Array.isArray(latestDigest.insightsJson) ? latestDigest.insightsJson : [];
    const actionInsight = insights.find((ins) => ins.action);
    if (actionInsight) {
      wins.push({
        icon: <ArrowRight className="w-4 h-4" />,
        color: "text-blue-400",
        label: "AI recommendation",
        title: actionInsight.title,
        action: actionInsight.action!,
        priority: "low",
      });
    }
  }

  const top3 = wins.slice(0, 3);

  if (top3.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">This week&apos;s quick wins</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {top3.map((win, i) => {
          const badge = priorityLabel(win.priority);
          return (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className={cn("flex items-center gap-1.5 text-xs font-semibold", win.color)}>
                  {win.icon}
                  {win.label}
                </span>
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", badge.cls)}>
                  {badge.text}
                </span>
              </div>
              <p className="text-slate-200 text-sm font-medium leading-snug">{win.title}</p>
              <div className="mt-auto bg-slate-800 rounded-xl p-3">
                <p className="text-slate-400 text-xs leading-relaxed">{win.action}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
