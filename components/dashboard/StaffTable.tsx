"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ChevronRight } from "lucide-react";
import { formatCurrency, formatPct, cn } from "@/lib/utils";

interface StaffRow {
  id: string;
  name: string;
  role: string;
  transactions: number;
  avgTicket: number;
  repeatRate: number;
  revenue: number;
}

type SortKey = keyof Omit<StaffRow, "id" | "role">;

export default function StaffTable({ staff }: { staff: StaffRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("repeatRate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  return (
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
          {sorted.map((s, i) => (
            <tr key={s.id} className={cn("border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors", i === sorted.length - 1 && "border-0")}>
              <td className="pl-6 pr-4 py-4">
                <div className="font-medium text-slate-100 text-sm">{s.name}</div>
                <div className="text-slate-500 text-xs">{s.role}</div>
              </td>
              <td className="py-4 text-slate-300 text-sm tabular-nums">{s.transactions.toLocaleString()}</td>
              <td className="py-4 text-slate-300 text-sm tabular-nums">{formatCurrency(s.avgTicket)}</td>
              <td className="py-4">
                <span className={cn("text-xs font-semibold px-2 py-1 rounded-full tabular-nums", repeatRateColor(s.repeatRate))}>
                  {formatPct(s.repeatRate)}
                </span>
              </td>
              <td className="py-4 text-slate-300 text-sm tabular-nums">{formatCurrency(s.revenue)}</td>
              <td className="pr-4 py-4">
                <Link href={`/dashboard/staff/${s.id}`} className="text-slate-500 hover:text-blue-400 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
