"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Users, BarChart3, ArrowRight, Sparkles, ChevronDown, ChevronUp, CheckCircle, Copy, Check } from "lucide-react";
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
  plainText: string;
  generatedAt: string;
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  top_performer: { icon: <TrendingUp className="w-4 h-4" />, color: "text-green-400 bg-green-400/10", label: "Top performer" },
  bottom_performer: { icon: <TrendingDown className="w-4 h-4" />, color: "text-red-400 bg-red-400/10", label: "Needs attention" },
  profitable_shift: { icon: <BarChart3 className="w-4 h-4" />, color: "text-blue-400 bg-blue-400/10", label: "Profitable shift" },
  unprofitable_shift: { icon: <BarChart3 className="w-4 h-4" />, color: "text-orange-400 bg-orange-400/10", label: "Losing shift" },
  repeat_rate_trend: { icon: <Users className="w-4 h-4" />, color: "text-purple-400 bg-purple-400/10", label: "Repeat trend" },
  reallocation: { icon: <ArrowRight className="w-4 h-4" />, color: "text-yellow-400 bg-yellow-400/10", label: "Reallocation" },
};

function InsightItem({ insight }: { insight: InsightCard }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = TYPE_META[insight.type] || TYPE_META.top_performer;

  function copyInsight() {
    const text = `${insight.title}\n\n${insight.body}${insight.action ? `\n\nAction: ${insight.action}` : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-800/40 transition-colors group"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full shrink-0 mt-0.5 whitespace-nowrap", meta.color)}>
          {meta.icon}
          <span className="hidden sm:inline">{meta.label}</span>
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
              <div className="flex-1">
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-wide block mb-1">Do this</span>
                <p className="text-blue-200 text-sm leading-relaxed">{insight.action}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={copyInsight}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy insight"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DigestPanel({ digest }: { digest: Digest | null }) {
  if (!digest) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center">
        <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm font-medium mb-1">Your first digest is being generated.</p>
        <p className="text-slate-500 text-xs">Usually ready within a few hours of connecting your POS.</p>
      </div>
    );
  }

  const insights: InsightCard[] = Array.isArray(digest.insightsJson) ? digest.insightsJson : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-500 text-xs flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-blue-400" />
          Week of {new Date(digest.weekOf).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" · "}{insights.length} insights
        </span>
        <span className="text-slate-600 text-xs">Click to expand</span>
      </div>
      {insights.map((insight, i) => (
        <InsightItem key={i} insight={insight} />
      ))}
    </div>
  );
}
