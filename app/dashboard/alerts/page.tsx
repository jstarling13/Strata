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

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [plan, setPlan] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => {
        setAlerts(d.alerts || []);
        setPlan(d.plan || "");
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
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="font-bold text-lg mb-2">Anomaly alerts are a Plus feature</h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
            Get notified immediately when a staff member&apos;s repeat rate drops more than 15% or a shift&apos;s labor cost spikes past 150% of your target.
          </p>
          <div className="flex flex-col gap-2 items-center text-sm text-slate-400 mb-6">
            {["Instant email alerts", "Weekly digest (included)", "Labor cost spike detection", "Repeat rate drop detection", "Priority support"].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                {f}
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Upgrade to Plus →
          </Link>
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
