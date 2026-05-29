"use client";

import { useState } from "react";
import { Play, RefreshCw, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Org {
  id: string;
  name: string;
  type: string;
  plan: string;
  status: string;
  onboardingDone: boolean;
  createdAt: string;
  dataSources: { type: string; status: string; lastSyncAt: string | null }[];
  weeklyDigests: { weekOf: string; generatedAt: string }[];
  anomalyAlerts: { type: string; message: string; createdAt: string }[];
}

export default function AdminClient({ orgs, mrr }: { orgs: Org[]; mrr: number }) {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [cronSecret, setCronSecret] = useState("");
  const [secretVisible, setSecretVisible] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<string | null>(null);

  async function triggerDigest(orgId: string) {
    if (!cronSecret) { setSecretVisible(true); return; }
    setRunning(orgId);
    try {
      const res = await fetch(`/api/agents/weekly-digest?orgId=${orgId}&secret=${encodeURIComponent(cronSecret)}`);
      const data = await res.json();
      setResults((r) => ({ ...r, [orgId]: { ok: !!data.ok, msg: data.ok ? "Generated!" : (data.error || "Failed") } }));
    } finally {
      setRunning(null);
    }
  }

  const planColor: Record<string, string> = {
    trial: "text-yellow-400 bg-yellow-400/10",
    standard: "text-blue-400 bg-blue-400/10",
    plus: "text-purple-400 bg-purple-400/10",
    cancelled: "text-slate-500 bg-slate-700",
  };

  const statusIcon = (status: string) => {
    if (status === "active") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "error") return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-slate-500" />;
  };

  const activeOrgs = orgs.filter((o) => o.plan !== "cancelled").length;
  const trialOrgs = orgs.filter((o) => o.plan === "trial").length;

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-blue-500 font-bold text-xl">Strata</span>
            <h1 className="text-2xl font-bold mt-1">Admin</h1>
          </div>
          <div className="flex gap-8">
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-400">${mrr.toLocaleString()}</div>
              <div className="text-slate-400 text-sm">MRR</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{activeOrgs}</div>
              <div className="text-slate-400 text-sm">Active orgs</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-yellow-400">{trialOrgs}</div>
              <div className="text-slate-400 text-sm">In trial</div>
            </div>
          </div>
        </div>

        {/* Plan breakdown */}
        <div className="grid grid-cols-4 gap-4">
          {(["trial", "standard", "plus", "cancelled"] as const).map((p) => (
            <div key={p} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold">{orgs.filter((o) => o.plan === p).length}</div>
              <div className="text-slate-400 text-sm capitalize">{p}</div>
            </div>
          ))}
        </div>

        {/* Cron secret input */}
        {secretVisible && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-300 block mb-2">Cron secret (to trigger digests manually)</label>
              <input
                type="password"
                value={cronSecret}
                onChange={(e) => setCronSecret(e.target.value)}
                placeholder="Enter CRON_SECRET"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setSecretVisible(false)}
              disabled={!cronSecret}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors mt-6"
            >
              Save
            </button>
          </div>
        )}

        {!secretVisible && !cronSecret && (
          <button
            onClick={() => setSecretVisible(true)}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            + Set cron secret to enable manual digest triggers
          </button>
        )}

        {/* Org table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {["Organization", "Plan", "Integration", "Last sync", "Last digest", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.map((org, i) => {
                const ds = org.dataSources[0];
                const digest = org.weeklyDigests[0];
                const result = results[org.id];
                return (
                  <>
                    <tr
                      key={org.id}
                      className={cn("border-b border-slate-800/50 hover:bg-slate-800/20", i === orgs.length - 1 && !expandedAlerts && "border-0")}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{org.name}</div>
                        <div className="text-slate-500 text-xs capitalize">{org.type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-semibold uppercase px-2 py-1 rounded-full", planColor[org.plan] || planColor.cancelled)}>
                          {org.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 capitalize">{ds?.type || "—"}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {ds?.lastSyncAt ? new Date(ds.lastSyncAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {digest ? new Date(digest.weekOf).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(org.status)}
                          <span className="text-xs text-slate-400 capitalize">{org.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => triggerDigest(org.id)}
                            disabled={running === org.id || !org.onboardingDone}
                            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {running === org.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                            {result ? result.msg : "Run digest"}
                          </button>
                          {org.anomalyAlerts.length > 0 && (
                            <button
                              onClick={() => setExpandedAlerts(expandedAlerts === org.id ? null : org.id)}
                              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                            >
                              {org.anomalyAlerts.length} alert{org.anomalyAlerts.length !== 1 ? "s" : ""}
                              {expandedAlerts === org.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedAlerts === org.id && (
                      <tr className="border-b border-slate-800/50">
                        <td colSpan={7} className="px-4 py-3 bg-slate-800/30">
                          <div className="space-y-1.5">
                            {org.anomalyAlerts.map((alert, ai) => (
                              <div key={ai} className="text-xs text-orange-300 flex items-start gap-2">
                                <span className="text-orange-500 shrink-0">•</span>
                                {alert.message}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
