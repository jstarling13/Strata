"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ChevronRight, Pencil } from "lucide-react";
import { formatCurrency, formatPct, cn } from "@/lib/utils";
import EditStaffModal from "./EditStaffModal";

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

type SortKey = keyof Omit<StaffRow, "id" | "role" | "prevRepeatRate">;

export default function StaffTable({ staff, isDemo }: { staff: StaffRow[]; isDemo?: boolean }) {
  const [sortKey, setSortKey] = useState<SortKey>("repeatRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localNames, setLocalNames] = useState<Record<string, { name: string; role: string }>>({});

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...staff].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  function repeatRateColor(rate: number) {
    if (rate >= 0.5) return "text-green-400 bg-green-400/10";
    if (rate >= 0.3) return "text-yellow-400 bg-yellow-400/10";
    return "text-red-400 bg-red-400/10";
  }

  const colHeader = (label: string, key: SortKey) => (
    <th
      className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 pb-3 cursor-pointer hover:text-slate-300 transition-colors select-none"
      onClick={() => toggleSort(key)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("w-3 h-3", sortKey === key ? "text-blue-400" : "")} />
      </span>
    </th>
  );

  if (!staff.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
        No staff data yet. Sync your POS to see performance metrics.
      </div>
    );
  }

  const editingStaff = editingId ? sorted.find((s) => s.id === editingId) : null;

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 px-6">
              <th className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500 pb-3 pt-4 pl-6 pr-4">Staff member</th>
              {colHeader("Transactions", "transactions")}
              {colHeader("Avg ticket", "avgTicket")}
              {colHeader("Repeat rate", "repeatRate")}
              {colHeader("Revenue", "revenue")}
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const display = localNames[s.id] || { name: s.name, role: s.role };
              const delta = s.prevRepeatRate != null ? s.repeatRate - s.prevRepeatRate : null;

              return (
                <tr key={s.id} className={cn("border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group", i === sorted.length - 1 && "border-0")}>
                  <td className="pl-6 pr-4 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-slate-100 text-sm">{display.name}</div>
                        <div className="text-slate-500 text-xs">{display.role}</div>
                      </div>
                      {!isDemo && (
                        <button
                          onClick={() => setEditingId(s.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-700"
                          title="Edit staff member"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-slate-300 text-sm tabular-nums">{s.transactions.toLocaleString()}</td>
                  <td className="py-4 text-slate-300 text-sm tabular-nums">{formatCurrency(s.avgTicket)}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-semibold px-2 py-1 rounded-full tabular-nums", repeatRateColor(s.repeatRate))}>
                        {formatPct(s.repeatRate)}
                      </span>
                      {delta !== null && (
                        <span className={cn("text-xs tabular-nums", delta >= 0 ? "text-green-500" : "text-red-500")}>
                          {delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-slate-300 text-sm tabular-nums">{formatCurrency(s.revenue)}</td>
                  <td className="pr-4 py-4">
                    {isDemo ? (
                      <span className="text-slate-700"><ChevronRight className="w-4 h-4" /></span>
                    ) : (
                      <Link href={`/dashboard/staff/${s.id}`} className="text-slate-500 hover:text-blue-400 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingStaff && (
        <EditStaffModal
          staff={{ id: editingStaff.id, name: localNames[editingStaff.id]?.name ?? editingStaff.name, role: localNames[editingStaff.id]?.role ?? editingStaff.role }}
          onClose={() => setEditingId(null)}
          onSaved={(updated) => {
            setLocalNames((prev) => ({ ...prev, [editingStaff.id]: updated }));
            setEditingId(null);
          }}
        />
      )}
    </>
  );
}
