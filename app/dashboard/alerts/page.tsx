"use client";

import { useEffect, useState } from "react";
import { Loader2, Bell, AlertTriangle, TrendingDown, Zap, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "repeat_rate_drop" | "labor_cost_spike";
  message: string;
  sentAt: string | null;
  createdAt: string;
}

const ALERT_META = {
  repeat_rate_drop: {
    icon: <TrendingDown className="w-4 h-4" />,
    color: "text-orange-400 bg-orange-400/10 border-orange-500/20",
    label: "Repeat rate drop",
  },
  labor_cost_spike: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-red-400 bg-red-400/10 border-red-500/20",
    label: "Labor spike",
  },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

interface Preview {
  overTargetShiftCount: number;
  bigDropperCount: number;
  bigDroppers: Array<{ name: string; drop: number }>;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [plan, setPlan] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => {
        setAlerts(d.alerts || []);
        setPlan(d.plan || "");
        setPreview(d.preview || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isPlus = plan === "plus";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Anomaly alerts</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {isPlus ? "Real-time flags when something shifts in your numbers." : "Plus plan feature — upgrade to receive anomaly alerts."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-500" />
          {alerts.length > 0 && (
            <span className="text-xs bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">{alerts.length}</span>
          )}
        </div>
      </div>

      {!isPlus && (
        <div className="space-y-4">
          {/* Real-data preview */}
          {preview && (preview.overTargetShiftCount > 0 || preview.bigDropperCount > 0) && (
            <div className="bg-slate-900 border border-orange-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Right now — issues Strata can alert you about</span>
              </div>
              <div className="space-y-2">
                {preview.overTargetShiftCount > 0 && (
                  <div className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3 blur-[2px] select-none">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-sm text-slate-300">
                      <strong className="text-red-400">{preview.overTargetShiftCount} shift{preview.overTargetShiftCount !== 1 ? "s" : ""}</strong> running &gt;20% over your labor target this week
                    </p>
                  </div>
                )}
                {preview.bigDroppers.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3 blur-[2px] select-none">
                    <TrendingDown className="w-4 h-4 text-orange-400 shrink-0" />
                    <p className="text-sm text-slate-300">
                      <strong className="text-orange-400">{d.name}</strong>&apos;s repeat rate dropped {Math.round(d.drop * 100)}pts vs last week — no one&apos;s noticed yet
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">Upgrade to see this in real time and get email alerts before these become expensive problems.</p>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="font-bold text-lg mb-2">Anomaly alerts are a Plus feature</h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
              Get an email the moment a repeat rate drops &gt;15% or labor spikes past 150% of your target — before your weekly digest catches it.
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto mb-6 text-left">
              {[
                "Instant email alerts",
                "Repeat rate drop detection",
                "Labor cost spike detection",
                "Up to 4 locations",
                "Unlimited staff",
                "Priority support",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Upgrade to Plus — starts at $167/mo →
            </Link>
          </div>
        </div>
      )}

      {isPlus && alerts.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center">
          <Bell className="w-10 h-10 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-medium mb-1">No alerts yet — that&apos;s good</p>
          <p className="text-slate-500 text-sm">You&apos;ll see alerts here when a repeat rate drops &gt;15% or a shift spikes &gt;150% of your labor target.</p>
        </div>
      )}

      {isPlus && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const meta = ALERT_META[alert.type] || ALERT_META.labor_cost_spike;
            return (
              <div key={alert.id} className={cn("border rounded-2xl p-5 flex items-start gap-4", meta.color)}>
                <div className={cn("flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 mt-0.5", meta.color)}>
                  {meta.icon}
                  {meta.label}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 text-sm leading-relaxed">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span>{timeAgo(alert.createdAt)}</span>
                    {alert.sentAt && <span className="text-green-500">· Email sent</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isPlus && (
        <p className="text-xs text-slate-600">
          Alerts are checked automatically after each data sync. You&apos;ll also receive an email for each alert.
        </p>
      )}
    </div>
  );
}
