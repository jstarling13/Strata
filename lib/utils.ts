import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

type ShiftSlot = "morning" | "lunch" | "afternoon" | "evening";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function getShiftSlot(hour: number): ShiftSlot {
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 17) return "afternoon";
  return "evening";
}

export function shiftSlotLabel(slot: ShiftSlot): string {
  const labels: Record<ShiftSlot, string> = {
    morning: "Morning (6–11am)",
    lunch: "Lunch (11am–2pm)",
    afternoon: "Afternoon (2–5pm)",
    evening: "Evening (5–10pm)",
  };
  return labels[slot];
}

export function dayLabel(day: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day];
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
