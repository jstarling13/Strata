"use client";

import { useState } from "react";
import { Play, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
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
  const [results, setResults] = useState<Record<string, string>>({});

  async function triggerDigest(orgId: string) {
    setRunning(orgId);
    try {
      const res = await fetch(`/api/agents/weekly-digest?orgId=${orgId}&secret=${prompt("Enter cron secret:")}`);
      const data = await res.json();
      setResults((r) => ({ ...r, [orgId]: data.ok ? "Generated!" : data.error }));
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

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-blue-500 font-bold text-xl">Strata</span>
            <h1 className="text-2xl font-bold mt-1">Admin</h1>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-400">${mrr.toLocaleString()}</div>
              <div className="text-slate-400 text-sm">MRR</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{orgs.length}</div>
              <div className="text-slate-400 text-sm">Total orgs</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {(["trial", "standard", "plus"] as const).map((p) => (
            <div key={p} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold">{orgs.filter((o) => o.plan === p).length}</div>
              <div className="text-slate-400 text-sm capitalize">{p}</div>
            </div>
          ))}
        </div>

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
                return (
                  <tr key={org.id} className={cn("border-b border-slate-800/50 hover:bg-slate-800/20", i === orgs.length - 1 && "border-0")}>
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
                      <button
                        onClick={() => triggerDigest(org.id)}
                        disabled={running === org.id || !org.onboardingDone}
                        className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {running === org.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        {results[org.id] || "Run digest"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
