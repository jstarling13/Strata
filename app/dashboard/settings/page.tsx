"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, Building2, Target, Database, CreditCard, ExternalLink, Bell, Gift, Copy } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ORG_TYPES = ["restaurant", "cafe", "salon", "gym", "retail", "other"] as const;

export default function SettingsPage() {
  const [org, setOrg] = useState<any>(null);
  const [dataSource, setDataSource] = useState<any>(null);
  const [referrals, setReferrals] = useState<{ total: number; converted: number; creditsEarned: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [laborTarget, setLaborTarget] = useState(30);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [digestDay, setDigestDay] = useState(1);
  const [alertEmail, setAlertEmail] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState(20);
  const [copiedReferral, setCopiedReferral] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setOrg(d.org);
        setDataSource(d.dataSource);
        setReferrals(d.referrals ?? null);
        setName(d.org.name);
        setLaborTarget(Math.round(d.org.laborCostTarget * 100));
        // Load from DB (with localStorage fallback for legacy data)
        if (d.org.digestDay != null) setDigestDay(d.org.digestDay);
        if (d.org.alertEmailEnabled != null) setAlertEmail(d.org.alertEmailEnabled);
        if (d.org.alertThreshold != null) setAlertThreshold(d.org.alertThreshold);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          laborCostTarget: laborTarget / 100,
          digestDay,
          alertEmailEnabled: alertEmail,
          alertThreshold,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://strata.ai";
  const referralUrl = org ? `${appUrl}/sign-up?ref=${org.id}` : "";

  function copyReferral() {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const planLabel = org?.plan === "trial" ? "Free trial" : org?.plan === "standard" ? "Standard" : org?.plan === "plus" ? "Plus" : "—";

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your business profile and preferences.</p>
      </div>

      {/* Business info */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
          <Building2 className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-sm">Business info</h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Business name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Business type</label>
            <p className="text-xs text-slate-500 mb-2">Used for industry benchmarking. Contact support to change.</p>
            <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-xl text-sm text-slate-300 capitalize">
              {org?.type}
            </div>
          </div>
        </div>
      </section>

      {/* Labor cost target */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
          <Target className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-sm">Labor cost target</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-400 text-sm">The labor cost % threshold that triggers shift alerts and benchmarking.</p>
          <div className="text-center py-2">
            <div className="text-5xl font-bold text-blue-400 mb-1">{laborTarget}%</div>
            <div className="text-slate-500 text-sm">of revenue goes to labor</div>
          </div>
          <input
            type="range"
            min={10}
            max={60}
            value={laborTarget}
            onChange={(e) => setLaborTarget(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-600">
            <span>10% (lean)</span>
            <span>60% (high cost)</span>
          </div>
          <div className="bg-slate-800 rounded-xl p-3 text-xs text-slate-400">
            Industry benchmarks: Restaurants 28–35% · Cafes 30–38% · Salons 35–45% · Gyms 25–32%
          </div>
        </div>
      </section>

      {/* Notification preferences */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
          <Bell className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-sm">Notifications</h2>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Weekly digest delivery day</label>
            <p className="text-xs text-slate-500 mb-2">Your AI digest email will be sent on this day each week.</p>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((day, i) => (
                <button
                  key={i}
                  onClick={() => setDigestDay(i)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    digestDay === i
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-300"
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-300">Labor alert emails</label>
                <p className="text-xs text-slate-500 mt-0.5">Get an email when a shift runs over your labor target.</p>
              </div>
              <button
                onClick={() => setAlertEmail(!alertEmail)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  alertEmail ? "bg-blue-600" : "bg-slate-700"
                )}
              >
                <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", alertEmail && "translate-x-5")} />
              </button>
            </div>

            {alertEmail && (
              <div className="mt-3">
                <label className="block text-xs text-slate-500 mb-2">Alert threshold — send when labor is over target by:</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(parseInt(e.target.value))}
                    className="flex-1 accent-blue-500"
                  />
                  <span className="text-blue-400 font-bold text-sm w-12 text-right">+{alertThreshold}%</span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5">
                  You&apos;ll be alerted when any shift runs at {laborTarget + alertThreshold}%+ labor cost.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Referral program */}
      <section className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
          <Gift className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-sm">Referral program</h2>
          <span className="ml-auto text-xs bg-blue-600/20 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">1 month free per referral</span>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-400 text-sm leading-relaxed">
            Share Strata with other business owners. Every owner who starts a paid plan through your link earns you <strong className="text-slate-200">1 free month</strong> — credited automatically.
          </p>

          {/* Referral link */}
          <div>
            <label className="block text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Your referral link</label>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5">
              <span className="flex-1 text-sm text-slate-300 font-mono truncate">{referralUrl}</span>
              <button
                onClick={copyReferral}
                className="shrink-0 flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {copiedReferral ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedReferral ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Referral stats */}
          {referrals && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-slate-100">{referrals.total}</div>
                <div className="text-xs text-slate-500 mt-0.5">Signups</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-green-400">{referrals.converted}</div>
                <div className="text-xs text-slate-500 mt-0.5">Upgraded</div>
              </div>
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-blue-400">{referrals.creditsEarned}</div>
                <div className="text-xs text-slate-500 mt-0.5">Months earned</div>
              </div>
            </div>
          )}

          {referrals && referrals.total === 0 && (
            <p className="text-xs text-slate-600 text-center py-1">No referrals yet — share your link to start earning.</p>
          )}
        </div>
      </section>

      {/* Data source */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
          <Database className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-sm">Data source</h2>
        </div>
        <div className="p-6">
          {dataSource ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-100 font-medium capitalize">{dataSource.type}</div>
                <div className="text-slate-500 text-xs mt-0.5">
                  {dataSource.lastSyncAt
                    ? `Last synced ${new Date(dataSource.lastSyncAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                    : "Never synced"}
                  {" · "}
                  <span className={dataSource.status === "active" ? "text-green-500" : "text-red-500"}>
                    {dataSource.status}
                  </span>
                </div>
              </div>
              <Link
                href="/onboarding?step=2"
                className="text-sm text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors"
              >
                Change <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-slate-400 text-sm">No data source connected.</div>
              <Link href="/onboarding?step=2" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Connect →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Billing */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
          <CreditCard className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-sm">Plan & billing</h2>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div>
            <div className="text-slate-100 font-medium">{planLabel}</div>
            {org?.plan === "trial" && org?.trialEndsAt && (
              <div className="text-slate-500 text-xs mt-0.5">
                Trial ends {new Date(org.trialEndsAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </div>
            )}
          </div>
          <Link
            href="/dashboard/billing"
            className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            {org?.plan === "trial" ? "Upgrade →" : "Manage billing →"}
          </Link>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-slate-500 text-xs">Changes to your labor target take effect on the next dashboard refresh.</p>
        <button
          onClick={save}
          disabled={saving || !name}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
        >
          {saved ? (
            <><Check className="w-4 h-4 text-green-300" /> Saved</>
          ) : saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : "Save changes"}
        </button>
      </div>
    </div>
  );
}
