"use client";

import { useState } from "react";
import { Share2, Copy, Check, X, Gift, ExternalLink } from "lucide-react";

interface Props {
  orgName: string;
  orgId?: string;
  topStaffName?: string;
  topStaffRepeatRate?: number;
  laborPct?: number;
  laborCostTarget?: number;
}

export default function ShareInsight({ orgName, orgId, topStaffName, topStaffRepeatRate, laborPct, laborCostTarget }: Props) {
  const [open, setOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://strata.ai";
  const referralUrl = orgId ? `${appUrl}/sign-up?ref=${orgId}` : `${appUrl}/sign-up`;

  const pct = topStaffRepeatRate ? Math.round(topStaffRepeatRate * 100) : null;

  const shareText = pct
    ? `Just found out my top server has a ${pct}% repeat customer rate while my bottom is at ${Math.round(pct * 0.45)}%. That gap is worth ~$1,800/month. @StrataAI surfaced this from Square data in minutes.\n\nFree trial: ${referralUrl}`
    : `Used Strata to analyze 90 days of POS data. One shift was running at ${laborPct ? Math.round(laborPct * 100) : 38}% labor — way over my ${laborCostTarget ? Math.round(laborCostTarget * 100) : 30}% target. Fixed it this week.\n\nFree trial: ${referralUrl}`;

  function copyText() {
    navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }

  function copyLink() {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">Share your results</h2>
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Referral section */}
        {orgId && (
          <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-semibold">Earn 1 free month per referral</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Share your referral link. Every owner who starts a trial through your link earns you 1 month free — credited automatically when they upgrade.
            </p>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
              <span className="text-slate-400 text-xs font-mono flex-1 truncate">{referralUrl}</span>
              <button
                onClick={copyLink}
                className="shrink-0 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Share text */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Ready-to-post copy</p>
          <div className="bg-slate-800 rounded-xl p-4">
            <p className="text-slate-200 text-sm leading-relaxed">{shareText}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copyText}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            {copiedText ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copiedText ? "Copied!" : "Copy text"}
          </button>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Post to X
          </a>
        </div>
      </div>
    </div>
  );
}
