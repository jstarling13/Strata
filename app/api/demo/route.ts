import { NextResponse } from "next/server";
import { dayLabel, shiftSlotLabel } from "@/lib/utils";

// Static demo data — Corner Table restaurant, no DB required
export async function GET() {
  const staffStats = [
    { id: "demo-1", name: "Maria Santos", role: "Server", transactions: 312, avgTicket: 38.4, repeatRate: 0.68, revenue: 11981 },
    { id: "demo-2", name: "Priya Patel", role: "Barista", transactions: 289, avgTicket: 22.1, repeatRate: 0.61, revenue: 6387 },
    { id: "demo-3", name: "James Lee", role: "Server", transactions: 274, avgTicket: 35.8, repeatRate: 0.45, revenue: 9809 },
    { id: "demo-4", name: "Sam Torres", role: "Host", transactions: 198, avgTicket: 31.2, repeatRate: 0.38, revenue: 6178 },
    { id: "demo-5", name: "Devon Clark", role: "Server", transactions: 241, avgTicket: 36.1, repeatRate: 0.22, revenue: 8700 },
  ];

  const DAYS = [0, 1, 2, 3, 4, 5, 6];
  const SLOTS = ["morning", "lunch", "afternoon", "evening"] as const;

  // Simulate realistic shift performance — Thursday lunch is the loss-leader
  const shiftPerformance = DAYS.flatMap((day) =>
    SLOTS.map((slot) => {
      const isThursLunch = day === 4 && slot === "lunch";
      const isWeekend = day === 0 || day === 6;
      const isFridayEvening = day === 5 && slot === "evening";

      let totalSales = 400 + Math.random() * 300;
      if (isThursLunch) totalSales = 180;
      if (isWeekend) totalSales *= 1.4;
      if (isFridayEvening) totalSales = 1240;

      const laborCost = 340;
      const laborPct = laborCost / totalSales;

      return {
        dayOfWeek: day,
        shiftSlot: slot,
        totalSales: Math.round(totalSales),
        laborCost,
        laborPct: Math.round(laborPct * 1000) / 1000,
        transactionCount: Math.round(totalSales / 35),
      };
    })
  );

  const bestShift = [...shiftPerformance].sort((a, b) => a.laborPct - b.laborPct)[0];
  const worstShift = [...shiftPerformance].sort((a, b) => b.laborPct - a.laborPct)[0];
  const teamAvgRepeat = staffStats.reduce((s, m) => s + m.repeatRate, 0) / staffStats.length;

  const insights = [
    {
      title: "Maria Santos is your most valuable employee",
      body: "Maria's 68% repeat customer rate is 2.2× your team average of 31%. Her customers come back — Devon Clark's customers largely don't. The revenue difference between these two staff members handling the same number of shifts is approximately $1,840/month.",
      type: "top_performer",
      action: "Schedule Maria on your highest-value shifts: Friday evening and Saturday afternoon. These are your busiest slots and her repeat rate will compound.",
    },
    {
      title: "Thursday lunch is costing you $160 every week",
      body: "Thursday lunch generates $180 in sales against $340 in labor — a 189% labor cost ratio vs. your 30% target. This single shift loses $640/month.",
      type: "unprofitable_shift",
      action: "Cut Thursday lunch to a skeleton crew of 2 starting next week. Or close it entirely and redirect staff to Thursday evening, which runs at 24% labor cost.",
    },
    {
      title: "Friday evening is your most profitable shift",
      body: `${dayLabel(5)} ${shiftSlotLabel("evening")} runs at ${Math.round(bestShift.laborPct * 100)}% labor cost — your lowest across all 28 shift slots. Every dollar spent on labor this shift generates $${(1 / bestShift.laborPct).toFixed(2)} in sales.`,
      type: "profitable_shift",
      action: "Make sure your best-performing staff (Maria, Priya) are always scheduled Friday evening. Never leave this shift to new or low-retention employees.",
    },
    {
      title: "Devon Clark has a 22% repeat rate — 3× below Maria",
      body: "Devon serves a similar number of customers as the team average but retains almost none of them. Customers served by Devon return at roughly 1-in-5 vs. Maria's 2-in-3. At Devon's transaction volume, this gap costs approximately $740/month in lost return visits.",
      type: "bottom_performer",
      action: "Have a direct conversation with Devon about customer experience. If no improvement in 30 days, move Devon to back-of-house or non-customer-facing prep shifts.",
    },
    {
      title: "Your team average repeat rate is 31% — industry median is 38%",
      body: "You're 7 points below median for a casual dining restaurant. The gap is almost entirely explained by Devon Clark pulling the average down. Removing Devon from customer-facing shifts alone would bring your team average to 41%.",
      type: "repeat_rate_trend",
      action: "Track this number weekly. Your goal for 60 days from now: 40%+ team average repeat rate. Strata will alert you if you're trending the wrong direction.",
    },
    {
      title: "Moving Maria to Thursday evenings recovers ~$380/week",
      body: "Maria currently works 0 Thursday evening shifts. Her repeat customer rate suggests her customers would return at 3× the rate of your Thursday evening average. Projecting her ticket size and repeat rate onto that slot: approximately $380 in incremental weekly revenue.",
      type: "reallocation",
      action: "Swap Devon off Thursday evening. Put Maria on it for 3 weeks and compare revenue to the prior 3-week Thursday evening baseline.",
    },
  ];

  // Simulate 4-week revenue trend
  const weeklyRevenue = staffStats.reduce((s, m) => s + m.revenue, 0);
  const revenueTrend = [
    { weekOf: new Date(Date.now() - 21 * 86400000).toISOString(), revenue: weeklyRevenue * 0.82 },
    { weekOf: new Date(Date.now() - 14 * 86400000).toISOString(), revenue: weeklyRevenue * 0.89 },
    { weekOf: new Date(Date.now() - 7 * 86400000).toISOString(), revenue: weeklyRevenue * 0.93 },
    { weekOf: new Date().toISOString(), revenue: weeklyRevenue },
  ];

  return NextResponse.json({
    isDemo: true,
    org: {
      id: "demo",
      name: "The Corner Table",
      type: "restaurant",
      plan: "standard",
      laborCostTarget: 0.3,
      trialEndsAt: null,
    },
    overview: {
      weeklyRevenue,
      prevWeekRevenue: weeklyRevenue * 0.93,
      laborPct: 0.34,
      laborCostTarget: 0.3,
      topStaff: { name: "Maria Santos", repeatRate: 0.68 },
      teamAvgRepeatRate: Math.round(teamAvgRepeat * 1000) / 1000,
      prevTeamAvgRepeatRate: Math.round(teamAvgRepeat * 1000) / 1000 - 0.02,
      bestShift: { dayOfWeek: bestShift.dayOfWeek, shiftSlot: bestShift.shiftSlot, laborPct: bestShift.laborPct },
      worstShift: worstShift.laborPct > 0.3
        ? { dayOfWeek: worstShift.dayOfWeek, shiftSlot: worstShift.shiftSlot, laborPct: worstShift.laborPct }
        : null,
    },
    staffStats: staffStats.map((s) => ({
      ...s,
      prevRepeatRate: Math.max(0, s.repeatRate + (Math.random() > 0.5 ? -0.04 : 0.03)),
    })),
    shiftPerformance,
    latestDigest: {
      id: "demo-digest",
      weekOf: new Date().toISOString(),
      insightsJson: insights,
      plainText: insights.map((i) => `${i.title}: ${i.body}`).join("\n\n"),
      generatedAt: new Date().toISOString(),
    },
    lastSyncAt: new Date().toISOString(),
    revenueTrend,
    allDigests: [
      { id: "demo-digest", weekOf: new Date().toISOString(), generatedAt: new Date().toISOString() },
    ],
    hasData: true,
  });
}
