"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2, ExternalLink, CreditCard, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    key: "standard",
    name: "Standard",
    monthlyPrice: 129,
    annualPrice: 999,
    annualMonthly: 83,
    description: "For single-location businesses",
    features: [
      "1 location",
      "Weekly performance digest",
      "Up to 20 staff members",
      "Shift profitability heatmap",
      "Repeat customer attribution",
      "Square + Toast + CSV",
    ],
  },
  {
    key: "plus",
    name: "Plus",
    monthlyPrice: 229,
    annualPrice: 1999,
    annualMonthly: 167,
    description: "For multi-location operators",
    features: [
      "Up to 4 locations",
      "Daily insights + anomaly alerts",
      "Unlimited staff members",
      "Direct API integrations",
      "Email anomaly alerts",
      "Priority support",
    ],
  },
];

export default function BillingPage() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then((d) => setOrg(d.org));
  }, []);

  async function handleSelectPlan(plan: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
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
          <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-300 text-sm">
            Your free trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? "s" : ""}</strong>. Add a payment method to keep access to your data.
          </div>
        )}
      </div>

      {/* Billing interval toggle */}
      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setInterval("monthly")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", interval === "monthly" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-300")}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval("annual")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", interval === "annual" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-300")}
        >
          Annual
          <span className="bg-green-500/20 text-green-400 text-xs font-bold px-1.5 py-0.5 rounded-md">Save 35%</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          const price = interval === "annual" ? plan.annualMonthly : plan.monthlyPrice;
          const billed = interval === "annual" ? `$${plan.annualPrice} billed annually` : "billed monthly";

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
              <div className="flex items-end gap-1 mb-0.5">
                <span className="text-3xl font-bold">${price}</span>
                <span className="text-slate-400 mb-0.5">/mo</span>
              </div>
              <p className="text-slate-500 text-xs mb-1">{billed}</p>
              <p className="text-slate-400 text-sm mb-5">{plan.description}</p>

              {interval === "annual" && (
                <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2 mb-5">
                  <Zap className="w-3.5 h-3.5" />
                  You save ${(plan.monthlyPrice * 12 - plan.annualPrice).toLocaleString()} per year vs monthly
                </div>
              )}

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
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Get ${plan.name} — 14 days free`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {(currentPlan === "standard" || currentPlan === "plus") && (
        <div className="border border-slate-800 rounded-2xl p-6 bg-slate-900">
          <h2 className="font-semibold mb-2">Manage your subscription</h2>
          <p className="text-slate-400 text-sm mb-4">Update payment method, view invoices, or cancel through the Stripe billing portal.</p>
          <button
            onClick={openPortal}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Open billing portal
          </button>
        </div>
      )}

      <div className="text-slate-600 text-xs text-center pb-4">
        One unprofitable shift costs more than a month of Strata. Cancel anytime.
      </div>
    </div>
  );
}
