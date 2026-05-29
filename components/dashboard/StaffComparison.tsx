"use client";

import { useState } from "react";
import { X, TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
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

interface Props {
  staff: StaffRow[];
}

export default function StaffComparison({ staff }: Props) {
  const [open, setOpen] = useState(false);

  if (staff.length < 2) return null;

  const sorted = [...staff].sort((a, b) => b.repeatRate - a.repeatRate);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const repeatDiff = top.repeatRate - bottom.repeatRate;
  const revenueDiff = top.revenue - bottom.revenue;
  const monthlyImpact = Math.round(revenueDiff * 4.3);

  function bar(value: number, max: number, color: string) {
    const pct = Math.min(100, (value / max) * 100);
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(top.revenue, bottom.revenue);
  const maxTransactions = Math.max(top.transactions, bottom.transactions);
  const maxTicket = Math.max(top.avgTicket, bottom.avgTicket);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <Users className="w-3.5 h-3.5" />
        Compare top & bottom
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-lg">Performance gap</h2>
                <p className="text-slate-400 text-sm">Top vs bottom performer this week</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gap summary */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-center">
              <div className="text-red-400 text-2xl font-bold mb-1">
                {(repeatDiff * 100).toFixed(0)}pt repeat rate gap
              </div>
              <div className="text-slate-400 text-sm">
                Equivalent to ~<strong className="text-slate-200">${monthlyImpact.toLocaleString()}/month</strong> in lost return visit revenue
              </div>
            </div>

            {/* Side by side */}
            <div className="grid grid-cols-2 gap-6">
              {[{ person: top, label: "Top performer", icon: <TrendingUp className="w-4 h-4 text-green-400" />, barColor: "bg-green-500" },
                { person: bottom, label: "Needs coaching", icon: <TrendingDown className="w-4 h-4 text-red-400" />, barColor: "bg-red-500" }
              ].map(({ person, label, icon, barColor }) => (
                <div key={person.id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    {icon}
                    <div>
                      <div className="font-semibold text-slate-100">{person.name}</div>
                      <div className="text-slate-500 text-xs">{label} · {person.role}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Repeat rate", value: formatPct(person.repeatRate), rawValue: person.repeatRate * 100, max: 100, unit: "%" },
                      { label: "Revenue", value: formatCurrency(person.revenue), rawValue: person.revenue, max: maxRevenue, unit: "" },
                      { label: "Transactions", value: person.transactions.toLocaleString(), rawValue: person.transactions, max: maxTransactions, unit: "" },
                      { label: "Avg ticket", value: formatCurrency(person.avgTicket), rawValue: person.avgTicket, max: maxTicket, unit: "" },
                    ].map(({ label, value, rawValue, max }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">{label}</span>
                          <span className="text-slate-200 font-medium tabular-nums">{value}</span>
                        </div>
                        {bar(rawValue, max, barColor)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-slate-800 rounded-xl p-4 text-sm text-slate-400">
              <strong className="text-slate-200">What to do:</strong> Move {top.name} to your busiest high-revenue shifts. Have a 1:1 with {bottom.name} about their customer interactions — a {Math.round(repeatDiff * 100)}pt gap this size is almost always a specific behavior, not just talent.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
