"use client";

import { useState } from "react";
import { dayLabel, shiftSlotLabel, formatCurrency, formatPct, cn } from "@/lib/utils";

type ShiftSlot = "morning" | "lunch" | "afternoon" | "evening";

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const SLOTS: ShiftSlot[] = ["morning", "lunch", "afternoon", "evening"];

interface ShiftData {
  dayOfWeek: number;
  shiftSlot: ShiftSlot;
  totalSales: number;
  laborCost: number;
  laborPct: number;
  transactionCount: number;
}

function cellColor(laborPct: number, target: number) {
  const ratio = laborPct / target;
  if (laborPct === 0) return "bg-slate-800 text-slate-700";
  if (ratio <= 0.8) return "bg-green-500/20 text-green-300 border-green-500/20";
  if (ratio <= 1.0) return "bg-green-500/10 text-green-400/70 border-green-500/10";
  if (ratio <= 1.2) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/20";
  if (ratio <= 1.5) return "bg-orange-500/20 text-orange-300 border-orange-500/20";
  return "bg-red-500/20 text-red-300 border-red-500/20";
}

export default function ShiftHeatmap({ shifts, target }: { shifts: ShiftData[]; target: number }) {
  const [tooltip, setTooltip] = useState<{ shift: ShiftData; x: number; y: number } | null>(null);

  const dataMap = new Map(shifts.map((s) => [`${s.dayOfWeek}_${s.shiftSlot}`, s]));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative">
      {/* Column headers */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
        <div />
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 pb-1">{dayLabel(d)}</div>
        ))}
      </div>

      {/* Rows */}
      {SLOTS.map((slot) => (
        <div key={slot} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
          <div className="text-xs text-slate-500 flex items-center pr-2 leading-tight">
            {slot === "morning" ? "6–11am" : slot === "lunch" ? "11–2pm" : slot === "afternoon" ? "2–5pm" : "5–10pm"}
          </div>
          {DAYS.map((day) => {
            const s = dataMap.get(`${day}_${slot}`);
            return (
              <div
                key={day}
                className={cn(
                  "h-10 rounded-lg border flex items-center justify-center text-xs font-semibold cursor-pointer transition-all hover:scale-105",
                  s && s.laborPct > 0 ? cellColor(s.laborPct, target) : "bg-slate-800 border-slate-700 text-slate-700"
                )}
                onMouseEnter={(e) => s && setTooltip({ shift: s, x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setTooltip(null)}
              >
                {s && s.laborPct > 0 ? `${Math.round(s.laborPct * 100)}%` : "—"}
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
        <span>Labor as % of sales vs your {formatPct(target)} target:</span>
        <div className="flex gap-2">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/20 inline-block" />Under target</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/20 inline-block" />Near</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20 inline-block" />Over</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1 pointer-events-none"
          style={{ top: tooltip.y + 12, left: tooltip.x + 12 }}
        >
          <div className="font-semibold text-slate-100">{dayLabel(tooltip.shift.dayOfWeek)} · {shiftSlotLabel(tooltip.shift.shiftSlot)}</div>
          <div className="text-slate-400">Sales: <span className="text-slate-200">{formatCurrency(tooltip.shift.totalSales)}</span></div>
          <div className="text-slate-400">Labor: <span className="text-slate-200">{formatCurrency(tooltip.shift.laborCost)}</span></div>
          <div className="text-slate-400">Labor %: <span className="text-slate-200">{formatPct(tooltip.shift.laborPct)}</span></div>
          <div className="text-slate-400">Transactions: <span className="text-slate-200">{tooltip.shift.transactionCount}</span></div>
        </div>
      )}
    </div>
  );
}
