"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2, ExternalLink, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    key: "standard",
    name: "Standard",
    price: "$129/mo",
    description: "For single-location businesses",
    features: ["1 location", "Weekly performance digest", "Up to 20 staff", "Square + Toast integration"],
  },
  {
    key: "plus",
    name: "Plus",
    price: "$229/mo",
    description: "For multi-location operators",
    features: ["Up to 4 locations", "Daily insights", "Unlimited staff", "Anomaly alerts", "Direct API integrations"],
  },
];

export default function BillingPage() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setOrg(d.org));
  }, []);

  async function handleSelectPlan(plan: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  const currentPlan = org?.plan;
  const trialEndsAt = org?.trialEndsAt ? new Date(org.trialEndsAt) : null;
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        {currentPlan === "trial" && trialEndsAt && (
          <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-400 text-sm">
            Your free trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>. Add a payment method to keep access.
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <div
              key={plan.key}
              className={cn(
                "border rounded-2xl p-6 flex flex-col",
                isCurrent ? "border-blue-500 bg-blue-600/5" : "border-slate-800 bg-slate-900"
              )}
            >
              {isCurrent && (
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">Current plan</span>
              )}
              <div className="text-xl font-bold mb-0.5">{plan.name}</div>
              <div className="text-3xl font-bold mb-1">{plan.price}</div>
              <p className="text-slate-400 text-sm mb-5">{plan.description}</p>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button
                  onClick={openPortal}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  <CreditCard className="w-4 h-4" /> Manage billing
                </button>
              ) : (
                <button
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {(currentPlan === "standard" || currentPlan === "plus") && (
        <div className="border border-slate-800 rounded-2xl p-6 bg-slate-900">
          <h2 className="font-semibold mb-2">Manage your subscription</h2>
          <p className="text-slate-400 text-sm mb-4">Update payment method, view invoices, or cancel your subscription through the Stripe portal.</p>
          <button
            onClick={openPortal}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Open billing portal
          </button>
        </div>
      )}
    </div>
  );
}
