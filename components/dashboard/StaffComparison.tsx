"use client";

import { useState } from "react";
import { X, TrendingUp, TrendingDown, Users, Award, ChevronDown } from "lucide-react";
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

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function StaffComparison({ staff }: Props) {
  const [open, setOpen] = useState(false);
  const sorted = [...staff].sort((a, b) => b.repeatRate - a.repeatRate);
  const [aId, setAId] = useState(sorted[0]?.id || "");
  const [bId, setBId] = useState(sorted[sorted.length - 1]?.id || "");

  if (staff.length < 2) return null;

  const a = staff.find((s) => s.id === aId) || sorted[0];
  const b = staff.find((s) => s.id === bId) || sorted[sorted.length - 1];

  const repeatDiff = Math.abs(a.repeatRate - b.repeatRate);
  const aWinner = a.repeatRate >= b.repeatRate;
  const winner = aWinner ? a : b;
  const loser = aWinner ? b : a;
  const revenueDiff = Math.abs(a.revenue - b.revenue);
  const monthlyImpact = Math.round(revenueDiff * 4.3);

  const maxRevenue = Math.max(a.revenue, b.revenue);
  const maxTransactions = Math.max(a.transactions, b.transactions);
  const maxTicket = Math.max(a.avgTicket, b.avgTicket);

  const stats = (person: StaffRow) => [
    { label: "Repeat rate", value: formatPct(person.repeatRate), rawValue: person.repeatRate * 100, max: 100 },
    { label: "Revenue", value: formatCurrency(person.revenue), rawValue: person.revenue, max: maxRevenue },
    { label: "Transactions", value: person.transactions.toLocaleString(), rawValue: person.transactions, max: maxTransactions },
    { label: "Avg ticket", value: formatCurrency(person.avgTicket), rawValue: person.avgTicket, max: maxTicket },
  ];

  const aWinsCount = [
    a.repeatRate > b.repeatRate,
    a.revenue > b.revenue,
    a.transactions > b.transactions,
    a.avgTicket > b.avgTicket,
  ].filter(Boolean).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors border border-slate-700 px-3 py-1.5 rounded-lg"
      >
        <Users className="w-3.5 h-3.5" />
        Compare staff
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="font-bold text-lg">Staff comparison</h2>
                <p className="text-slate-400 text-sm">Select any two staff to compare side-by-side</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-[1fr_40px_1fr] gap-2 px-6 pt-5 pb-4 items-center">
              <select
                value={aId}
                onChange={(e) => setAId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === bId}>{s.name}</option>
                ))}
              </select>
              <div className="text-center text-slate-500 font-bold text-xs">VS</div>
              <select
                value={bId}
                onChange={(e) => setBId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === aId}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Gap banner */}
            {repeatDiff > 0.02 && (
              <div className="mx-6 mb-4 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                <span className="text-orange-300 text-sm font-medium">
                  <strong>{(repeatDiff * 100).toFixed(0)}pt</strong> repeat rate gap ≈{" "}
                  <strong>${monthlyImpact.toLocaleString()}/month</strong> in lost return visits
                </span>
              </div>
            )}

            {/* Side-by-side stats */}
            <div className="grid grid-cols-2 gap-0 border-t border-slate-800">
              {[
                { person: a, wins: aWinsCount, color: "bg-blue-500", textColor: "text-blue-400" },
                { person: b, wins: 4 - aWinsCount, color: "bg-purple-500", textColor: "text-purple-400" },
              ].map(({ person, wins, color, textColor }, idx) => (
                <div key={person.id} className={cn("p-5 space-y-4", idx === 0 && "border-r border-slate-800")}>
                  <div className="flex items-center gap-2">
                    {wins >= 3 && <Award className="w-4 h-4 text-yellow-400 shrink-0" />}
                    <div>
                      <div className="font-semibold text-slate-100 text-sm">{person.name}</div>
                      <div className="text-slate-500 text-xs">{person.role} · {wins}/4 categories</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {stats(person).map(({ label, value, rawValue, max }) => {
                      const otherVal = idx === 0
                        ? stats(b).find(s => s.label === label)?.rawValue ?? 0
                        : stats(a).find(s => s.label === label)?.rawValue ?? 0;
                      const isBetter = rawValue >= otherVal;
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-500">{label}</span>
                            <span className={cn("font-semibold tabular-nums", isBetter ? textColor : "text-slate-400")}>
                              {value}
                            </span>
                          </div>
                          <StatBar value={rawValue} max={max} color={isBetter ? color : "bg-slate-700"} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendation */}
            <div className="p-5 border-t border-slate-800 bg-slate-800/40">
              <div className="flex items-start gap-2">
                {winner.repeatRate > loser.repeatRate * 1.2 ? (
                  <TrendingUp className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <p className="text-slate-300 text-sm leading-relaxed">
                  <strong className="text-slate-100">Recommendation:</strong>{" "}
                  {winner.repeatRate > loser.repeatRate * 1.2
                    ? `Schedule ${winner.name} on your busiest high-revenue shifts. Their ${formatPct(winner.repeatRate)} repeat rate means their customers come back — compounding revenue over time. Have a 1:1 with ${loser.name} to understand why their retention is lower.`
                    : `These two are closely matched. Focus scheduling decisions on shift-level revenue data in the heatmap rather than repeat rate alone.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
