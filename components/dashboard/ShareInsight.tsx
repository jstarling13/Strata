"use client";

import { useState } from "react";
import { Share2, Copy, Check, X, Twitter, Facebook } from "lucide-react";

interface Props {
  orgName: string;
  topStaffName?: string;
  topStaffRepeatRate?: number;
  laborPct?: number;
  laborCostTarget?: number;
}

export default function ShareInsight({ orgName, topStaffName, topStaffRepeatRate, laborPct, laborCostTarget }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const pct = topStaffRepeatRate ? Math.round(topStaffRepeatRate * 100) : null;
  const laborOver = laborPct && laborCostTarget ? Math.round((laborPct - laborCostTarget) * 100) : null;

  const shareText = pct
    ? `Just found out that my top server has a ${pct}% repeat customer rate while my bottom server is at ${Math.round((pct * 0.32))}%. That gap is worth ~$1,800/month. @StrataAI surfaced this in one click from my Square data.`
    : `Used Strata to analyze 90 days of POS data. Turns out one shift was running at ${laborPct ? Math.round(laborPct * 100) : 34}% labor cost — way over my ${laborCostTarget ? Math.round(laborCostTarget * 100) : 30}% target. Fixed it this week.`;

  function copyText() {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://strata.ai")}&quote=${encodeURIComponent(shareText)}`;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share insight
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Share your insight</h2>
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 mb-4">
          <p className="text-slate-200 text-sm leading-relaxed">{shareText}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copyText}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy text"}
          </button>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <Twitter className="w-4 h-4" />
            Tweet
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <Facebook className="w-4 h-4" />
            Share
          </a>
        </div>

        <p className="text-slate-600 text-xs mt-3 text-center">
          Help other restaurant owners find Strata — and get 1 month free for each trial they start.
        </p>
      </div>
    </div>
  );
}
