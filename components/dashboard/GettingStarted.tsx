"use client";

import { useState } from "react";
import { CheckCircle, Circle, ChevronDown, ChevronUp, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  hasData: boolean;
  hasDigest: boolean;
  plan: string;
}

const STEPS = [
  {
    id: "connect",
    title: "Connect your POS",
    desc: "Sync Square, Toast, Clover, or upload a CSV.",
    href: "/onboarding?step=2",
    cta: "Connect now →",
    alwaysDone: false,
  },
  {
    id: "data",
    title: "Your first data sync",
    desc: "Strata analyzed 90 days of transactions and built your baseline.",
    href: null,
    cta: null,
    alwaysDone: false,
  },
  {
    id: "digest",
    title: "Read your first weekly digest",
    desc: "Each insight has a specific action. Click to expand and copy.",
    href: "/dashboard/digests",
    cta: "View digest →",
    alwaysDone: false,
  },
  {
    id: "schedule",
    title: "Make your first scheduling change",
    desc: "Apply one insight from your digest. Most owners save $300+ in the first week.",
    href: null,
    cta: null,
    alwaysDone: false,
  },
  {
    id: "upgrade",
    title: "Upgrade to get instant alerts",
    desc: "Know the moment a repeat rate drops or a shift spikes — before it costs you.",
    href: "/dashboard/billing",
    cta: "Upgrade →",
    alwaysDone: false,
  },
];

export default function GettingStarted({ hasData, hasDigest, plan }: Props) {
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const completed = {
    connect: hasData,
    data: hasData,
    digest: hasDigest,
    schedule: false,
    upgrade: plan !== "trial",
  };

  const doneCount = Object.values(completed).filter(Boolean).length;
  const totalCount = STEPS.length;
  const allDone = doneCount === totalCount;

  if (allDone) return null;

  const pct = Math.round((doneCount / totalCount) * 100);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 flex items-center gap-4 text-left">
          <div className="shrink-0">
            <div className="text-sm font-semibold text-slate-100 mb-1">Getting started</div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-slate-500 text-xs">{doneCount} of {totalCount} done</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="text-slate-600 hover:text-slate-400 transition-colors p-1"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800">
          {STEPS.map((step, i) => {
            const done = (completed as any)[step.id];
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 border-b border-slate-800/60 last:border-0",
                  done ? "opacity-60" : ""
                )}
              >
                <div className="shrink-0 mt-0.5">
                  {done ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("font-medium text-sm mb-0.5", done ? "text-slate-400 line-through" : "text-slate-100")}>
                    {step.title}
                  </div>
                  <div className="text-slate-500 text-xs leading-relaxed">{step.desc}</div>
                </div>
                {!done && step.href && (
                  <Link
                    href={step.href}
                    className="shrink-0 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors whitespace-nowrap"
                  >
                    {step.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
