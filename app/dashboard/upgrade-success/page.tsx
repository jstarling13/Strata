"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight, Sparkles, Bell, Zap, BarChart3, Users, Calendar } from "lucide-react";

function SuccessInner() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "standard";
  const interval = searchParams.get("interval") || "monthly";
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
  }, []);

  const isPlus = plan === "plus";
  const planName = isPlus ? "Plus" : "Standard";
  const price = interval === "annual"
    ? (isPlus ? "$167/mo" : "$83/mo")
    : (isPlus ? "$229/mo" : "$129/mo");

  const orgName = data?.org?.name || "your business";
  const topStaff = data?.overview?.topStaff;
  const laborPct = data?.overview?.laborPct;
  const laborTarget = data?.overview?.laborCostTarget;

  const UNLOCKED = [
    {
      icon: <Sparkles className="w-5 h-5 text-blue-400" />,
      title: "Weekly AI digest — active",
      desc: "Every Monday, you get a plain-English analysis: top performer, worst shift, biggest opportunity, and one specific action to take.",
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-green-400" />,
      title: "Shift profitability heatmap — unlocked",
      desc: "See exactly which days and times are bleeding labor. Click any cell in the heatmap to drill into shift-level detail.",
    },
    {
      icon: <Users className="w-5 h-5 text-purple-400" />,
      title: "Staff performance tracking — live",
      desc: `${topStaff ? `${topStaff.name} is your current top performer` : "Your team repeat rates are now tracked"} — week over week, with trend arrows.`,
    },
    ...(isPlus ? [
      {
        icon: <Bell className="w-5 h-5 text-amber-400" />,
        title: "Anomaly alerts — enabled",
        desc: "You'll get an email the moment any repeat rate drops or a shift spikes over your labor target. Usually within the hour.",
      },
    ] : []),
    ...(laborPct && laborTarget && laborPct > laborTarget * 1.05 ? [
      {
        icon: <Zap className="w-5 h-5 text-orange-400" />,
        title: "Labor overspend detected",
        desc: `Your labor is currently ${Math.round((laborPct - laborTarget) * 100)}pts over your ${Math.round(laborTarget * 100)}% target. Check the dashboard — it shows exactly which shifts to fix first.`,
      },
    ] : []),
  ];

  return (
    <div className="flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-xl">

        {/* Celebration header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">You&apos;re on Strata {planName} 🎉</h1>
          <p className="text-slate-400 text-sm">
            {orgName} · {planName} plan · {price}
            {interval === "annual" && <span className="ml-2 text-green-400 font-semibold text-xs">35% off annual</span>}
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Your first charge will be in 14 days. Cancel any time with no penalty.
          </p>
        </div>

        {/* What just unlocked */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-800">
            <p className="text-sm font-semibold text-slate-100">What&apos;s active right now</p>
          </div>
          <div className="divide-y divide-slate-800/60">
            {UNLOCKED.map((item, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <div className="shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <div className="text-sm font-medium text-slate-100 mb-0.5">{item.title}</div>
                  <div className="text-slate-500 text-xs leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* First 3 actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-4">Your first 3 moves</p>
          <ol className="space-y-3">
            {[
              topStaff
                ? `Check ${topStaff.name}'s profile — see their 8-week trend and which shifts they cover`
                : "Open the Staff performance table and sort by repeat rate",
              "Look at the shift heatmap — find the one red cell and check how many hours it's costing you",
              isPlus
                ? "Confirm your alert threshold in Settings → Notifications (default: 20% over your labor target)"
                : "Bookmark the weekly digest archive — your Monday emails will stack up here",
            ].map((action, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-300">
                <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            Go to dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-5 py-3.5 rounded-xl transition-colors"
          >
            <BarChart3 className="w-4 h-4" /> Deep analytics
          </Link>
        </div>

        <p className="text-center text-slate-700 text-xs mt-5">
          Questions? Reply to any Strata email — we read everything.
        </p>
      </div>
    </div>
  );
}

export default function UpgradeSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
      </div>
    }>
      <SuccessInner />
    </Suspense>
  );
}
