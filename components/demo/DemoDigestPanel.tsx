"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Users, BarChart3, ArrowRight, Sparkles, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCard {
  title: string;
  body: string;
  type: string;
  action?: string;
}

interface Digest {
  id: string;
  weekOf: string;
  insightsJson: InsightCard[];
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  top_performer: { icon: <TrendingUp className="w-4 h-4" />, color: "text-green-400 bg-green-400/10" },
  bottom_performer: { icon: <TrendingDown className="w-4 h-4" />, color: "text-red-400 bg-red-400/10" },
  profitable_shift: { icon: <BarChart3 className="w-4 h-4" />, color: "text-blue-400 bg-blue-400/10" },
  unprofitable_shift: { icon: <BarChart3 className="w-4 h-4" />, color: "text-orange-400 bg-orange-400/10" },
  repeat_rate_trend: { icon: <Users className="w-4 h-4" />, color: "text-purple-400 bg-purple-400/10" },
  reallocation: { icon: <ArrowRight className="w-4 h-4" />, color: "text-yellow-400 bg-yellow-400/10" },
};

function InsightCard({ insight }: { insight: InsightCard }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[insight.type] || TYPE_META.top_performer;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-800/40 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full shrink-0 mt-0.5", meta.color)}>
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-100 text-sm leading-snug">{insight.title}</div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
          <p className="text-slate-400 text-sm leading-relaxed pt-3">{insight.body}</p>
          {insight.action && (
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-wide block mb-1">Do this</span>
                <p className="text-blue-200 text-sm leading-relaxed">{insight.action}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DemoDigestPanel({ digest }: { digest: Digest }) {
  const insights: InsightCard[] = Array.isArray(digest.insightsJson) ? digest.insightsJson : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>AI-generated · {insights.length} insights · click to expand</span>
        </div>
      </div>
      {insights.map((insight, i) => (
        <InsightCard key={i} insight={insight} />
      ))}
    </div>
  );
}
