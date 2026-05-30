"use client";

import { TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  annualRevenueOpportunity: number;
  annualLaborSavings: number;
  topStaffName?: string;
  weeklyRevenue: number;
}

export default function OpportunityBanner({
  annualRevenueOpportunity,
  annualLaborSavings,
  topStaffName,
  weeklyRevenue,
}: Props) {
  const totalOpportunity = annualRevenueOpportunity + annualLaborSavings;

  // Only show if there's meaningful opportunity ($500+/yr) and we have some data
  if (totalOpportunity < 500 || weeklyRevenue === 0) return null;

  const fmtCurrency = (n: number) =>
    n >= 10000
      ? `$${Math.round(n / 1000)}k`
      : `$${n.toLocaleString()}`;

  return (
    <div className="bg-gradient-to-r from-blue-950/80 to-slate-900 border border-blue-500/25 rounded-2xl px-6 py-5 flex items-center gap-6">
      <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
        <TrendingUp className="w-5 h-5 text-blue-400" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-2xl font-extrabold text-blue-300 tabular-nums">
            {fmtCurrency(totalOpportunity)}/yr
          </span>
          <span className="text-slate-400 text-sm font-medium">identified in your data</span>
        </div>
        <p className="text-slate-500 text-xs leading-relaxed">
          {annualRevenueOpportunity > 0 && annualLaborSavings > 0 ? (
            <>
              {fmtCurrency(annualRevenueOpportunity)} from closing the repeat-rate gap
              {topStaffName ? ` (everyone at ${topStaffName}'s level)` : ""} &middot;{" "}
              {fmtCurrency(annualLaborSavings)} from hitting your labor target every week
            </>
          ) : annualRevenueOpportunity > 0 ? (
            <>
              If your below-median staff matched {topStaffName ?? "your top performer"}&apos;s repeat rate,
              you&apos;d recover {fmtCurrency(annualRevenueOpportunity)} in annual revenue
            </>
          ) : (
            <>
              Your shifts are running over your labor target — fixing that is worth{" "}
              {fmtCurrency(annualLaborSavings)}/yr
            </>
          )}
        </p>
      </div>

      <Link
        href="/dashboard/staff"
        className="shrink-0 flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors"
      >
        See breakdown <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
