"use client";

import { useState } from "react";
import { ArrowRight, TrendingDown, DollarSign } from "lucide-react";
import Link from "next/link";

export default function RoiCalculator() {
  const [weeklyRevenue, setWeeklyRevenue] = useState(15000);
  const [laborPct, setLaborPct] = useState(36);
  const [target, setTarget] = useState(30);

  const weeklyLaborCost = weeklyRevenue * (laborPct / 100);
  const targetLaborCost = weeklyRevenue * (target / 100);
  const weekSavings = Math.max(0, weeklyLaborCost - targetLaborCost);
  const monthSavings = weekSavings * 4.33;
  const yearSavings = weekSavings * 52;
  const strataMonthly = 129;
  const netMonthly = Math.round(monthSavings) - strataMonthly;
  const roiMultiple = strataMonthly > 0 ? (monthSavings / strataMonthly).toFixed(1) : "0";

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-5 h-5 text-blue-400" />
        <h3 className="text-xl font-bold">Calculate your potential savings</h3>
      </div>
      <p className="text-slate-400 text-sm mb-8 leading-relaxed">
        Most owners don&apos;t know their labor % by shift. Strata does.
        Plug in your numbers to see what fixing it is actually worth.
      </p>

      {/* Inputs */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
              Weekly revenue
            </label>
            <span className="text-blue-400 font-bold tabular-nums text-sm">
              ${weeklyRevenue.toLocaleString()}
            </span>
          </div>
          <input
            type="range" min={2000} max={150000} step={500}
            value={weeklyRevenue}
            onChange={(e) => setWeeklyRevenue(parseInt(e.target.value))}
            className="w-full accent-blue-500 h-1.5"
          />
          <div className="flex justify-between text-slate-600 text-xs mt-1">
            <span>$2k</span><span>$150k</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
              Current labor cost %
            </label>
            <span className="text-red-400 font-bold tabular-nums text-sm">{laborPct}%</span>
          </div>
          <input
            type="range" min={20} max={65} step={1}
            value={laborPct}
            onChange={(e) => setLaborPct(parseInt(e.target.value))}
            className="w-full accent-red-500 h-1.5"
          />
          <div className="flex justify-between text-slate-600 text-xs mt-1">
            <span>20%</span><span className="text-slate-500">industry avg ~35%</span><span>65%</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
              Target labor cost %
            </label>
            <span className="text-green-400 font-bold tabular-nums text-sm">{target}%</span>
          </div>
          <input
            type="range" min={18} max={55} step={1}
            value={target}
            onChange={(e) => setTarget(Math.min(parseInt(e.target.value), laborPct - 1))}
            className="w-full accent-green-500 h-1.5"
          />
          <div className="flex justify-between text-slate-600 text-xs mt-1">
            <span>18%</span><span className="text-slate-500">restaurant median 30%</span><span>55%</span>
          </div>
        </div>
      </div>

      {/* Results */}
      {weekSavings > 0 ? (
        <div className="mt-8 space-y-4">
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-blue-500/20">
              <div className="p-4 text-center">
                <div className="text-xl font-bold text-slate-300 tabular-nums">
                  ${Math.round(weekSavings).toLocaleString()}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">per week</div>
              </div>
              <div className="p-4 text-center bg-blue-600/10">
                <div className="text-3xl font-bold text-blue-300 tabular-nums">
                  ${Math.round(monthSavings).toLocaleString()}
                </div>
                <div className="text-blue-400/70 text-xs font-semibold mt-0.5">per month</div>
              </div>
              <div className="p-4 text-center">
                <div className="text-xl font-bold text-slate-300 tabular-nums">
                  ${Math.round(yearSavings).toLocaleString()}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">per year</div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-800 rounded-xl p-4">
            <TrendingDown className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            <p className="text-slate-400 text-sm leading-relaxed">
              Moving from <span className="text-red-400 font-semibold">{laborPct}%</span> to{" "}
              <span className="text-green-400 font-semibold">{target}%</span> labor on{" "}
              <span className="text-blue-400 font-semibold">${weeklyRevenue.toLocaleString()}/week</span> revenue.{" "}
              After Strata ($129/mo), your net gain is{" "}
              <span className={netMonthly > 0 ? "text-green-400 font-bold" : "text-slate-300 font-bold"}>
                ${netMonthly.toLocaleString()}/month
              </span>.{" "}
              That&apos;s a <span className="text-blue-400 font-bold">{roiMultiple}× ROI</span>.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-8 bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
          <p className="text-green-400 text-sm font-medium">Your target is already at or above your current rate — raise the gap to see savings potential.</p>
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/sign-up"
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
        >
          See these numbers with your real data <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-center text-slate-600 text-xs mt-3">14-day free trial · No credit card required · Connect Square in 60 seconds</p>
      </div>
    </div>
  );
}
