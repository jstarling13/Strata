"use client";

import { Calendar, ChevronRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatPct, dayLabel, shiftSlotLabel, cn } from "@/lib/utils";

interface ShiftData {
  dayOfWeek: number;
  shiftSlot: string;
  totalSales: number;
  laborPct: number;
  transactionCount: number;
}

interface StaffRow {
  id: string;
  name: string;
  repeatRate: number;
  transactions: number;
}

interface Props {
  shiftPerformance: ShiftData[];
  staffStats: StaffRow[];
  laborCostTarget: number;
}

interface Tip {
  icon: React.ReactNode;
  color: string;
  title: string;
  detail: string;
  href?: string;
}

export default function SchedulingTips({ shiftPerformance, staffStats, laborCostTarget }: Props) {
  const tips: Tip[] = [];

  const sortedByRevenue = [...shiftPerformance]
    .filter((s) => s.totalSales > 0)
    .sort((a, b) => b.totalSales - a.totalSales);

  const sortedStaff = [...staffStats].sort((a, b) => b.repeatRate - a.repeatRate);
  const topStaff = sortedStaff[0];
  const bottomStaff = sortedStaff[sortedStaff.length - 1];
  const topShift = sortedByRevenue[0];

  // Tip 1: Put top performer on best revenue shift
  if (topStaff && topShift && topStaff.repeatRate > 0.4) {
    tips.push({
      icon: <TrendingUp className="w-4 h-4" />,
      color: "text-green-400",
      title: `Schedule ${topStaff.name.split(" ")[0]} on ${dayLabel(topShift.dayOfWeek)} ${shiftSlotLabel(topShift.shiftSlot).split(" ")[0]}`,
      detail: `Your highest-repeat-rate staff (${formatPct(topStaff.repeatRate)}) should cover your highest-revenue shift. That combination maximizes return visits.`,
      href: `/dashboard/staff/${topStaff.id}`,
    });
  }

  // Tip 2: Identify over-staffed shifts (high labor, low revenue)
  const overstaffed = shiftPerformance
    .filter((s) => s.laborPct > laborCostTarget * 1.3 && s.totalSales > 0)
    .sort((a, b) => b.laborPct - a.laborPct)[0];

  if (overstaffed) {
    tips.push({
      icon: <Calendar className="w-4 h-4" />,
      color: "text-red-400",
      title: `Reduce coverage on ${dayLabel(overstaffed.dayOfWeek)} ${shiftSlotLabel(overstaffed.shiftSlot).split(" ")[0]}`,
      detail: `This shift runs at ${formatPct(overstaffed.laborPct)} labor — ${Math.round((overstaffed.laborPct / laborCostTarget - 1) * 100)}% over target. Try removing one part-time position or shortening shift duration.`,
    });
  }

  // Tip 3: Coach lowest performer
  if (bottomStaff && sortedStaff.length > 1 && bottomStaff.repeatRate < topStaff?.repeatRate * 0.7) {
    const gap = topStaff.repeatRate - bottomStaff.repeatRate;
    tips.push({
      icon: <TrendingUp className="w-4 h-4" />,
      color: "text-orange-400",
      title: `Coach ${bottomStaff.name.split(" ")[0]} — ${(gap * 100).toFixed(0)}pt gap vs ${topStaff.name.split(" ")[0]}`,
      detail: `Closing even half that gap would meaningfully improve team repeat rate. Schedule a 1:1 this week.`,
      href: `/dashboard/staff/${bottomStaff.id}`,
    });
  }

  // Tip 4: Look for high-revenue understaffed shifts
  const underTarget = shiftPerformance
    .filter((s) => s.totalSales > 0 && s.laborPct < laborCostTarget * 0.6 && s.transactionCount > 5)
    .sort((a, b) => b.totalSales - a.totalSales)[0];

  if (underTarget && tips.length < 3) {
    tips.push({
      icon: <Calendar className="w-4 h-4" />,
      color: "text-blue-400",
      title: `${dayLabel(underTarget.dayOfWeek)} ${shiftSlotLabel(underTarget.shiftSlot).split(" ")[0]} may be under-served`,
      detail: `High transaction volume at only ${formatPct(underTarget.laborPct)} labor suggests customers may be waiting. Consider adding coverage to improve service quality.`,
    });
  }

  if (tips.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Scheduling recommendations</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tips.slice(0, 3).map((tip, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className={cn("flex items-center gap-1.5 text-xs font-semibold", tip.color)}>
              {tip.icon}
              Scheduling tip
            </div>
            <p className="text-slate-200 text-sm font-medium leading-snug">{tip.title}</p>
            <p className="text-slate-500 text-xs leading-relaxed flex-1">{tip.detail}</p>
            {tip.href && (
              <Link
                href={tip.href}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-auto"
              >
                View staff profile <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
