"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, ChevronDown, ChevronUp, Calendar, TrendingUp, TrendingDown, Users, BarChart3, ArrowRight, CheckCircle, Copy, Check } from "lucide-react";
import Link from "next/link";
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
  generatedAt: string;
  insightsJson: InsightCard[];
  plainText: string;
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  top_performer: { icon: <TrendingUp className="w-3.5 h-3.5" />, color: "text-green-400 bg-green-400/10", label: "Top performer" },
  bottom_performer: { icon: <TrendingDown className="w-3.5 h-3.5" />, color: "text-red-400 bg-red-400/10", label: "Needs attention" },
  profitable_shift: { icon: <BarChart3 className="w-3.5 h-3.5" />, color: "text-blue-400 bg-blue-400/10", label: "Profitable shift" },
  unprofitable_shift: { icon: <BarChart3 className="w-3.5 h-3.5" />, color: "text-orange-400 bg-orange-400/10", label: "Losing shift" },
  repeat_rate_trend: { icon: <Users className="w-3.5 h-3.5" />, color: "text-purple-400 bg-purple-400/10", label: "Repeat trend" },
  reallocation: { icon: <ArrowRight className="w-3.5 h-3.5" />, color: "text-yellow-400 bg-yellow-400/10", label: "Reallocation" },
};

function InsightRow({ insight }: { insight: InsightCard }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = TYPE_META[insight.type] || TYPE_META.top_performer;

  function copy() {
    const text = `${insight.title}\n\n${insight.body}${insight.action ? `\n\nAction: ${insight.action}` : ""}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border-b border-slate-800 last:border-0">
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", meta.color)}>
          {meta.icon}
          <span className="hidden sm:inline">{meta.label}</span>
        </span>
        <span className="flex-1 text-sm text-slate-200 text-left">{insight.title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-slate-400 text-sm leading-relaxed">{insight.body}</p>
          {insight.action && (
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-blue-400 text-xs font-semibold uppercase tracking-wide block mb-1">Do this</span>
                <p className="text-blue-200 text-sm">{insight.action}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={copy} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DigestCard({ digest }: { digest: Digest }) {
  const [open, setOpen] = useState(false);
  const insights: InsightCard[] = Array.isArray(digest.insightsJson) ? digest.insightsJson : [];
  const weekDate = new Date(digest.weekOf);
  const generatedDate = new Date(digest.generatedAt);

  return (
    <div className={cn("bg-slate-900 border rounded-2xl overflow-hidden transition-colors", open ? "border-slate-600" : "border-slate-800")}>
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-100 text-sm">
            Week of {weekDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
          <div className="text-slate-500 text-xs mt-0.5">
            {insights.length} insight{insights.length !== 1 ? "s" : ""} · Generated {generatedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex gap-1">
            {insights.slice(0, 3).map((ins, i) => {
              const meta = TYPE_META[ins.type] || TYPE_META.top_performer;
              return (
                <span key={i} className={cn("text-xs px-2 py-0.5 rounded-full font-medium", meta.color)}>
                  {meta.label}
                </span>
              );
            })}
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-800">
          {insights.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-500 text-sm">No insights found for this week.</div>
          ) : (
            insights.map((ins, i) => <InsightRow key={i} insight={ins} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function DigestsPage() {
  const [digests, setDigests] = useState<Digest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/digests")
      .then((r) => r.json())
      .then((d) => setDigests(d.digests || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Digest archive</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {digests.length > 0
              ? `${digests.length} week${digests.length !== 1 ? "s" : ""} of AI-generated insights`
              : "No digests yet"}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors"
        >
          ← Back to dashboard
        </Link>
      </div>

      {digests.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
          <Sparkles className="w-10 h-10 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-medium mb-1">No digests generated yet</p>
          <p className="text-slate-500 text-sm">Your first weekly digest will appear here after your data syncs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {digests.map((d) => (
            <DigestCard key={d.id} digest={d} />
          ))}
        </div>
      )}

      {digests.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5" />
          Digests are generated every Monday morning and emailed to you.
        </div>
      )}
    </div>
  );
}
