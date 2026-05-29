"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const INDUSTRY_BENCHMARKS: Record<string, { repeatRate: number; laborPct: number; label: string }> = {
  restaurant: { repeatRate: 0.38, laborPct: 0.30, label: "casual dining" },
  cafe: { repeatRate: 0.42, laborPct: 0.32, label: "cafe" },
  salon: { repeatRate: 0.55, laborPct: 0.35, label: "salon" },
  gym: { repeatRate: 0.70, laborPct: 0.28, label: "gym/fitness" },
  retail: { repeatRate: 0.30, laborPct: 0.25, label: "retail" },
  other: { repeatRate: 0.35, laborPct: 0.30, label: "industry" },
};

export function RepeatRateBenchmark({ orgType, actual }: { orgType: string; actual: number }) {
  const bench = INDUSTRY_BENCHMARKS[orgType] || INDUSTRY_BENCHMARKS.other;
  const diff = actual - bench.repeatRate;
  const pct = Math.abs(Math.round(diff * 100));
  const above = diff >= 0;

  return (
    <div className={cn(
      "flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border",
      above ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
    )}>
      {above ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {pct}% {above ? "above" : "below"} {bench.label} median ({Math.round(bench.repeatRate * 100)}%)
    </div>
  );
}

export function LaborPctBenchmark({ orgType, actual, target }: { orgType: string; actual: number; target: number }) {
  const diff = actual - target;
  const over = diff > 0;
  const dollars = Math.abs(Math.round(diff * 100));

  if (Math.abs(diff) < 0.02) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border bg-slate-800 border-slate-700 text-slate-400">
        <Minus className="w-3.5 h-3.5" />
        On target ({Math.round(target * 100)}% labor goal)
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border",
      !over ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"
    )}>
      {over ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
      {dollars}pts {over ? "above" : "below"} your {Math.round(target * 100)}% target
    </div>
  );
}
