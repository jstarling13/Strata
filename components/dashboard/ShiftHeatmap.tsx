"use client";

import { useState } from "react";
import { dayLabel, shiftSlotLabel, formatCurrency, formatPct, cn } from "@/lib/utils";
import { X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

type ShiftSlot = "morning" | "lunch" | "afternoon" | "evening";

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const SLOTS: ShiftSlot[] = ["morning", "lunch", "afternoon", "evening"];
const SLOT_LABELS: Record<ShiftSlot, string> = {
  morning: "6–11am",
  lunch: "11–2pm",
  afternoon: "2–5pm",
  evening: "5–10pm",
};

interface ShiftData {
  dayOfWeek: number;
  shiftSlot: ShiftSlot;
  totalSales: number;
  laborCost: number;
  laborPct: number;
  transactionCount: number;
}

function cellColor(laborPct: number, target: number): string {
  const ratio = laborPct / target;
  if (laborPct === 0) return "bg-slate-800 text-slate-700 border-slate-700";
  if (ratio <= 0.7) return "bg-green-500/25 text-green-300 border-green-500/30";
  if (ratio <= 1.0) return "bg-green-500/12 text-green-400/80 border-green-500/15";
  if (ratio <= 1.2) return "bg-yellow-500/25 text-yellow-300 border-yellow-500/30";
  if (ratio <= 1.5) return "bg-orange-500/25 text-orange-300 border-orange-500/30";
  return "bg-red-500/25 text-red-300 border-red-500/30";
}

export default function ShiftHeatmap({ shifts, target }: { shifts: ShiftData[]; target: number }) {
  const [selected, setSelected] = useState<ShiftData | null>(null);

  const dataMap = new Map(shifts.map((s) => [`${s.dayOfWeek}_${s.shiftSlot}`, s]));

  const profitableSales = shifts.filter((s) => s.laborPct > 0 && s.laborPct <= target).reduce((sum, s) => sum + s.totalSales, 0);
  const unprofitableSales = shifts.filter((s) => s.laborPct > target).reduce((sum, s) => sum + s.totalSales, 0);
  const unprofitableLaborWaste = shifts
    .filter((s) => s.laborPct > target)
    .reduce((sum, s) => sum + (s.laborCost - s.totalSales * target), 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative">
      {/* Summary bar */}
      {unprofitableLaborWaste > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-2.5 text-xs">
          <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span className="text-slate-400">
            <strong className="text-red-400">{formatCurrency(unprofitableLaborWaste)}</strong> in excess labor waste this week across over-target shifts.
            {" "}Click any red cell for details.
          </span>
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-1 mb-1">
        <div />
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 pb-1">{dayLabel(d)}</div>
        ))}
      </div>

      {/* Rows */}
      {SLOTS.map((slot) => (
        <div key={slot} className="grid grid-cols-[64px_repeat(7,1fr)] gap-1 mb-1">
          <div className="text-xs text-slate-500 flex items-center pr-2 leading-tight">
            {SLOT_LABELS[slot]}
          </div>
          {DAYS.map((day) => {
            const s = dataMap.get(`${day}_${slot}`);
            const isSelected = selected?.dayOfWeek === day && selected?.shiftSlot === slot;
            return (
              <button
                key={day}
                className={cn(
                  "h-10 rounded-lg border flex items-center justify-center text-xs font-semibold transition-all hover:scale-105 hover:z-10 relative",
                  s && s.laborPct > 0 ? cellColor(s.laborPct, target) : "bg-slate-800 border-slate-700 text-slate-700",
                  isSelected ? "ring-2 ring-white/40 scale-105 z-10" : ""
                )}
                onClick={() => setSelected(isSelected ? null : s || null)}
              >
                {s && s.laborPct > 0 ? `${Math.round(s.laborPct * 100)}%` : "—"}
              </button>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 flex-wrap">
        <span className="hidden sm:inline">Labor % vs {formatPct(target)} target:</span>
        <div className="flex gap-2">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/20 inline-block" />Under</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/20 inline-block" />Near</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/20 inline-block" />Over</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20 inline-block" />Way over</span>
        </div>
      </div>

      {/* Shift detail panel */}
      {selected && (
        <div className="mt-4 bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-semibold text-slate-100 text-sm">
                {dayLabel(selected.dayOfWeek)} · {shiftSlotLabel(selected.shiftSlot)}
              </div>
              <div className={cn(
                "text-xs font-medium mt-0.5",
                selected.laborPct <= target ? "text-green-400" : selected.laborPct <= target * 1.2 ? "text-yellow-400" : "text-red-400"
              )}>
                {formatPct(selected.laborPct)} labor cost
                {selected.laborPct > target && ` — ${Math.round((selected.laborPct / target - 1) * 100)}% over target`}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-slate-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Revenue", value: formatCurrency(selected.totalSales), icon: <DollarSign className="w-3.5 h-3.5 text-blue-400" /> },
              { label: "Labor cost", value: formatCurrency(selected.laborCost), icon: <TrendingUp className="w-3.5 h-3.5 text-orange-400" /> },
              { label: "Transactions", value: selected.transactionCount.toString(), icon: <TrendingUp className="w-3.5 h-3.5 text-slate-400" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-slate-900 rounded-lg p-3">
                <div className="flex items-center justify-center gap-1 text-xs text-slate-500 mb-1">{icon}{label}</div>
                <div className="font-bold text-slate-100 text-sm tabular-nums">{value}</div>
              </div>
            ))}
          </div>

          {selected.laborPct > target && (
            <div className="mt-3 text-xs text-slate-400 bg-slate-900 rounded-lg px-3 py-2">
              <strong className="text-red-400">Excess labor: {formatCurrency(selected.laborCost - selected.totalSales * target)}</strong>
              {" "}— the cost difference between actual and your {formatPct(target)} target on this shift.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
