"use client";

import { useEffect, useState } from "react";
import { Loader2, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import StaffTable from "@/components/dashboard/StaffTable";
import StaffComparison from "@/components/dashboard/StaffComparison";
import StaffLeaderboard from "@/components/dashboard/StaffLeaderboard";
import { formatPct, cn } from "@/lib/utils";

interface StaffRow {
  id: string;
  name: string;
  role: string;
  transactions: number;
  avgTicket: number;
  repeatRate: number;
  revenue: number;
  prevRepeatRate?: number | null;
}

export default function StaffPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  async function exportCSV() {
    setDownloading(true);
    try {
      const res = await fetch("/api/export/staff");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `strata-staff-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const staff: StaffRow[] = data?.staffStats || [];
  const teamAvg = staff.length > 0 ? staff.reduce((s, m) => s + m.repeatRate, 0) / staff.length : 0;

  // Classify improvers / decliners
  const improvers = staff.filter((s) => s.prevRepeatRate != null && s.repeatRate - s.prevRepeatRate! > 0.03);
  const decliners = staff.filter((s) => s.prevRepeatRate != null && s.repeatRate - s.prevRepeatRate! < -0.03);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff performance</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {staff.length} staff member{staff.length !== 1 ? "s" : ""} · this week
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StaffComparison staff={staff} />
          <button
            onClick={exportCSV}
            disabled={downloading || !staff.length}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            {downloading ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {staff.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-2">Team avg repeat rate</div>
            <div className="text-2xl font-bold">{formatPct(teamAvg)}</div>
          </div>
          <div className="bg-slate-900 border border-green-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-1.5 text-green-400 text-xs uppercase tracking-wide font-medium mb-2">
              <TrendingUp className="w-3.5 h-3.5" /> Improving this week
            </div>
            <div className="text-2xl font-bold">
              {improvers.length > 0 ? (
                <span className="text-green-400">{improvers.length}</span>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
            {improvers.length > 0 && (
              <div className="text-slate-500 text-xs mt-1 truncate">{improvers.map((s) => s.name.split(" ")[0]).join(", ")}</div>
            )}
          </div>
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-1.5 text-red-400 text-xs uppercase tracking-wide font-medium mb-2">
              <TrendingDown className="w-3.5 h-3.5" /> Declining this week
            </div>
            <div className="text-2xl font-bold">
              {decliners.length > 0 ? (
                <span className="text-red-400">{decliners.length}</span>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
            {decliners.length > 0 && (
              <div className="text-slate-500 text-xs mt-1 truncate">{decliners.map((s) => s.name.split(" ")[0]).join(", ")}</div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard + full table in 2-col on larger screens */}
      {staff.length > 0 ? (
        <div className="grid lg:grid-cols-[340px_1fr] gap-8 items-start">
          <StaffLeaderboard staff={staff} />
          <div>
            <StaffTable staff={staff} />
            <p className="text-slate-600 text-xs mt-3">
              Click any row to see 8-week trends and transaction history. Hover a name to edit.
            </p>
          </div>
        </div>
      ) : (
        <StaffTable staff={staff} />
      )}
    </div>
  );
}
