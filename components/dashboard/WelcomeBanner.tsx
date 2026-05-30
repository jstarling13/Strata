"use client";

import { useState } from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  orgName: string;
  hasData: boolean;
}

export default function WelcomeBanner({ orgName, hasData }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600/15 to-purple-600/10 border border-blue-500/30 rounded-2xl px-6 py-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-slate-100 font-bold text-base">Welcome to Strata, {orgName}! 🎉</h2>
          </div>

          {hasData ? (
            <>
              <p className="text-slate-400 text-sm leading-relaxed mb-3">
                Your data is ready. Start with the <strong className="text-slate-200">Quick Wins</strong> section below — each one has a specific action and dollar impact.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setDismissed(true);
                    // Remove ?welcome=1 from URL cleanly, then scroll
                    router.replace("/dashboard");
                    setTimeout(() => {
                      document.getElementById("quick-wins-section")?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  See quick wins <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <Link
                  href="/dashboard/staff"
                  onClick={() => setDismissed(true)}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  View staff rankings
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-400 text-sm leading-relaxed mb-3">
                We&apos;re analyzing your last 90 days right now. It usually takes <strong className="text-slate-200">2–4 minutes</strong> for Square/Toast and about <strong className="text-slate-200">30 seconds</strong> for CSV.
                Refresh the page in a moment and your full analysis will be here.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  Processing your data
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
