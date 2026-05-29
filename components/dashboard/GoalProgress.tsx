"use client";

import { useState } from "react";
import { Target, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import { formatPct, cn } from "@/lib/utils";

interface Props {
  current: number;
  prev: number | null;
  laborPct: number;
  laborTarget: number;
}

const MILESTONES = [0.30, 0.40, 0.50, 0.60];

export default function GoalProgress({ current, prev, laborPct, laborTarget }: Props) {
  const [goalTarget, setGoalTarget] = useState(0.45);
  const [editing, setEditing] = useState(false);

  const progressPct = Math.min(100, Math.round((current / goalTarget) * 100));
  const onTrack = current >= goalTarget;
  const weekDelta = prev !== null ? current - prev : null;

  const nextMilestone = MILESTONES.find((m) => m > current) || goalTarget;
  const toNextMilestone = Math.max(0, nextMilestone - current);

  const laborOnTarget = laborPct <= laborTarget * 1.05;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-sm">Weekly goals</h3>
        </div>
        {editing ? (
          <button onClick={() => setEditing(false)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Done</button>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Set target</button>
        )}
      </div>

      {/* Repeat rate goal */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-xs">Team repeat rate goal</span>
          <div className="flex items-center gap-2">
            {editing ? (
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min={25}
                  max={80}
                  value={Math.round(goalTarget * 100)}
                  onChange={(e) => setGoalTarget(parseInt(e.target.value) / 100)}
                  className="w-20 accent-blue-500"
                />
                <span className="text-blue-400 text-xs font-bold w-10">{Math.round(goalTarget * 100)}%</span>
              </div>
            ) : (
              <span className="text-slate-500 text-xs">target: {Math.round(goalTarget * 100)}%</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", onTrack ? "bg-green-500" : "bg-blue-500")}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="shrink-0 text-right">
            <span className={cn("text-sm font-bold tabular-nums", onTrack ? "text-green-400" : "text-blue-400")}>
              {formatPct(current)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-slate-600 text-xs">0%</span>
          <div className="flex items-center gap-1.5">
            {weekDelta !== null && (
              <span className={cn("text-xs flex items-center gap-0.5", weekDelta >= 0 ? "text-green-500" : "text-red-500")}>
                {weekDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {weekDelta >= 0 ? "+" : ""}{(weekDelta * 100).toFixed(1)}pts this week
              </span>
            )}
          </div>
          <span className="text-slate-600 text-xs">{Math.round(goalTarget * 100)}%</span>
        </div>

        {!onTrack && (
          <p className="text-slate-500 text-xs mt-1.5">
            +{(toNextMilestone * 100).toFixed(0)}pts to next milestone ({Math.round(nextMilestone * 100)}%).
            {" "}At this rate: {Math.ceil(toNextMilestone / Math.max(0.001, weekDelta || 0.01))} weeks.
          </p>
        )}
        {onTrack && (
          <div className="flex items-center gap-1.5 text-green-400 text-xs mt-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Goal reached this week
          </div>
        )}
      </div>

      {/* Labor cost goal */}
      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-xs">Labor cost target</span>
          <span className="text-slate-500 text-xs">target: {Math.round(laborTarget * 100)}%</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", laborOnTarget ? "bg-green-500" : "bg-red-500")}
              style={{ width: `${Math.min(100, (laborPct / (laborTarget * 1.5)) * 100)}%` }}
            />
          </div>
          <span className={cn("shrink-0 text-sm font-bold tabular-nums", laborOnTarget ? "text-green-400" : "text-red-400")}>
            {formatPct(laborPct)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1.5">
          {laborOnTarget ? (
            <><CheckCircle className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400 text-xs">On target</span></>
          ) : (
            <span className="text-red-400 text-xs">
              {(Math.abs(laborPct - laborTarget) * 100).toFixed(1)}pts over target — check heatmap
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
