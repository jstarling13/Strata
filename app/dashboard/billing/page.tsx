"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Loader2, ExternalLink, CreditCard, Zap, Calculator, TrendingUp } from "lucide-react";
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
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then((d) => {
      setOrg(d.org);
      setDashboardData(d);
    });
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
  const isUrgent = daysLeft <= 3;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        {currentPlan === "trial" && trialEndsAt && (
          <div className={`mt-3 border rounded-xl px-5 py-4 ${isUrgent ? "bg-red-500/10 border-red-500/30" : "bg-yellow-500/10 border-yellow-500/20"}`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className={`text-sm font-semibold ${isUrgent ? "text-red-300" : "text-yellow-300"}`}>
                  {isUrgent && daysLeft === 0
                    ? "⚠️ Your trial ends today"
                    : `${isUrgent ? "⚠️ " : ""}Trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  After expiry, your insights are archived — not deleted. Upgrade any time to resume.
                </p>
              </div>
              <button
                onClick={() => handleSelectPlan("standard")}
                disabled={loading}
                className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                Upgrade now →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Personalized ROI banner — shows real numbers if data exists */}
      {dashboardData?.hasData && dashboardData?.overview && (() => {
        const opp = dashboardData.overview.annualRevenueOpportunity ?? 0;
        const labor = dashboardData.overview.annualLaborSavings ?? 0;
        const total = opp + labor;
        if (total < 500) return null;
        const fmtK = (n: number) => n >= 10000 ? `$${Math.round(n / 1000)}k` : `$${n.toLocaleString()}`;
        const planCost = 129 * 12; // annual standard
        const roiX = total > 0 ? (total / planCost).toFixed(1) : "0";
        return (
          <div className="bg-gradient-to-r from-blue-950/80 to-slate-900 border border-blue-500/25 rounded-2xl px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-semibold">Your actual numbers say it all</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <div className="text-2xl font-extrabold text-blue-300 tabular-nums">{fmtK(total)}/yr</div>
                <div className="text-slate-500 text-xs mt-0.5">Total opportunity identified</div>
              </div>
              {opp > 0 && (
                <div>
                  <div className="text-xl font-bold text-green-300 tabular-nums">{fmtK(opp)}/yr</div>
                  <div className="text-slate-500 text-xs mt-0.5">From repeat rate gap</div>
                </div>
              )}
              {labor > 0 && (
                <div>
                  <div className="text-xl font-bold text-orange-300 tabular-nums">{fmtK(labor)}/yr</div>
                  <div className="text-slate-500 text-xs mt-0.5">From labor overruns</div>
                </div>
              )}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Strata Standard is $129/mo. At your numbers, that&apos;s a <strong className="text-blue-300">{roiX}× annual ROI</strong> — purely from what&apos;s already sitting in your data.
            </p>
          </div>
        );
      })()}

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
                <div>
                  <button
                    onClick={() => handleSelectPlan(plan.key)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Get ${plan.name} — 14 days free`}
                  </button>
                  <p className="text-center text-slate-600 text-xs mt-2">No charge today · Cancel any time</p>
                </div>
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

      {/* ROI Calculator */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-sm">ROI calculator</h2>
          {dashboardData?.hasData && (
            <span className="ml-auto text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">Pre-filled with your data</span>
          )}
        </div>
        <ROICalc
          defaultWeeklyRevenue={dashboardData?.overview?.weeklyRevenue > 0 ? Math.round(dashboardData.overview.weeklyRevenue) : undefined}
          defaultLaborTarget={dashboardData?.overview?.laborCostTarget > 0 ? Math.round(dashboardData.overview.laborCostTarget * 100) : undefined}
          defaultCurrentLabor={dashboardData?.overview?.laborPct > 0 ? Math.round(dashboardData.overview.laborPct * 100) : undefined}
        />
      </div>

      <div className="text-slate-600 text-xs text-center pb-4">
        No contracts. Cancel any time. Data stays for 90 days if you pause.
      </div>
    </div>
  );
}

function ROICalc({
  defaultWeeklyRevenue,
  defaultLaborTarget,
  defaultCurrentLabor,
}: {
  defaultWeeklyRevenue?: number;
  defaultLaborTarget?: number;
  defaultCurrentLabor?: number;
} = {}) {
  const [weeklyRevenue, setWeeklyRevenue] = useState(defaultWeeklyRevenue ?? 12000);
  const [laborTarget, setLaborTarget] = useState(defaultLaborTarget ?? 30);
  const [currentLabor, setCurrentLabor] = useState(defaultCurrentLabor ?? 36);

  const monthlyRevenue = weeklyRevenue * 4.3;
  const laborGap = Math.max(0, currentLabor - laborTarget) / 100;
  const monthlyCost = monthlyRevenue * laborGap;
  const planCost = 129;
  const roi = Math.round((monthlyCost / planCost) * 10) / 10;

  return (
    <div className="space-y-5">
      <p className="text-slate-400 text-sm">How much is your current labor overage costing you per month?</p>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Weekly revenue", value: weeklyRevenue, setter: setWeeklyRevenue, prefix: "$", suffix: "", min: 1000, max: 100000, step: 500 },
          { label: "Your labor target", value: laborTarget, setter: setLaborTarget, prefix: "", suffix: "%", min: 15, max: 50, step: 1 },
          { label: "Actual labor cost", value: currentLabor, setter: setCurrentLabor, prefix: "", suffix: "%", min: 15, max: 70, step: 1 },
        ].map(({ label, value, setter, prefix, suffix, min, max, step }) => (
          <div key={label}>
            <label className="block text-xs text-slate-500 font-medium mb-1.5">{label}</label>
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-blue-500 transition-colors">
              {prefix && <span className="text-slate-500 text-sm mr-1">{prefix}</span>}
              <input
                type="number"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(e) => setter(Number(e.target.value) || 0)}
                className="flex-1 bg-transparent text-slate-100 text-sm focus:outline-none w-0 min-w-0"
              />
              {suffix && <span className="text-slate-500 text-sm ml-1">{suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {monthlyCost > 0 ? (
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-slate-400 text-xs mb-1">Monthly labor overage cost</div>
            <div className="text-2xl font-bold text-red-400">${Math.round(monthlyCost).toLocaleString()}/mo</div>
            <div className="text-slate-500 text-xs mt-0.5">
              Fixing {currentLabor - laborTarget}pts of labor waste at your revenue level
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-slate-400 text-xs mb-1">Strata Standard ROI</div>
            <div className="text-2xl font-bold text-green-400">{roi}×</div>
            <div className="text-slate-500 text-xs mt-0.5">
              ${planCost}/mo plan · ${Math.round(monthlyCost).toLocaleString()} recovered
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
          <p className="text-green-400 text-sm font-medium">You&apos;re at or below your labor target — great!</p>
          <p className="text-slate-500 text-xs mt-1">Strata helps you keep it that way with weekly alerts and shift visibility.</p>
        </div>
      )}
    </div>
  );
}
