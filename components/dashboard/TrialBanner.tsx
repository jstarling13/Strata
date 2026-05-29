"use client";

import Link from "next/link";
import { Zap, X } from "lucide-react";
import { useState } from "react";

interface Props {
  trialEndsAt: string | null;
  plan: string;
}

export default function TrialBanner({ trialEndsAt, plan }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || plan !== "trial" || !trialEndsAt) return null;

  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000));

  if (daysLeft > 7) return null;

  const urgent = daysLeft <= 2;

  return (
    <div className={`border-b px-6 py-2.5 flex items-center gap-3 text-sm ${urgent ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
      <Zap className={`w-4 h-4 shrink-0 ${urgent ? "text-red-400" : "text-amber-400"}`} />
      <span className={urgent ? "text-red-300" : "text-amber-300"}>
        {daysLeft === 0
          ? "Your free trial ends today."
          : `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`}{" "}
        Don&apos;t lose your data and insights.
      </span>
      <Link
        href="/dashboard/billing"
        className={`ml-auto shrink-0 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors ${urgent ? "bg-red-500 hover:bg-red-400 text-white" : "bg-amber-500 hover:bg-amber-400 text-slate-900"}`}
      >
        Upgrade now →
      </Link>
      <button onClick={() => setDismissed(true)} className="text-slate-500 hover:text-slate-300 transition-colors ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
