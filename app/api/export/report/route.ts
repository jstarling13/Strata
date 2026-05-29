import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const weekOf = startOfWeek(new Date());
  const prevWeek = new Date(weekOf);
  prevWeek.setDate(prevWeek.getDate() - 7);

  const [staffStats, prevStaffStats, shiftPerf, digest] = await Promise.all([
    prisma.staffWeeklyStats.findMany({
      where: { orgId: org.id, weekOf },
      include: { staff: true },
      orderBy: { repeatRate: "desc" },
    }),
    prisma.staffWeeklyStats.findMany({
      where: { orgId: org.id, weekOf: prevWeek },
    }),
    prisma.shiftPerformance.findMany({
      where: { orgId: org.id, weekOf },
      orderBy: [{ dayOfWeek: "asc" }, { shiftSlot: "asc" }],
    }),
    prisma.weeklyDigest.findFirst({
      where: { orgId: org.id },
      orderBy: { weekOf: "desc" },
    }),
  ]);

  const totalRevenue = staffStats.reduce((s, m) => s + m.revenue, 0);
  const totalLaborCost = shiftPerf.reduce((s, m) => s + m.laborCost, 0);
  const laborPct = totalRevenue > 0 ? totalLaborCost / totalRevenue : 0;
  const prevMap = new Map(prevStaffStats.map((s) => [s.staffId, s.repeatRate]));

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const SHIFT_LABELS: Record<string, string> = {
    morning: "6-11am",
    lunch: "11am-2pm",
    afternoon: "2-5pm",
    evening: "5-10pm",
  };

  const lines: string[][] = [];

  // Header
  lines.push([`Strata Weekly Report — ${org.name}`]);
  lines.push([`Week of: ${weekOf.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`]);
  lines.push([`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`]);
  lines.push([]);

  // Summary
  lines.push(["=== WEEKLY SUMMARY ==="]);
  lines.push(["Total Revenue", `$${totalRevenue.toFixed(2)}`]);
  lines.push(["Total Labor Cost", `$${totalLaborCost.toFixed(2)}`]);
  lines.push(["Labor Cost %", `${(laborPct * 100).toFixed(1)}%`]);
  lines.push(["Labor Target", `${(org.laborCostTarget * 100).toFixed(1)}%`]);
  lines.push(["Status", laborPct <= org.laborCostTarget ? "ON TARGET" : `OVER by ${((laborPct - org.laborCostTarget) * 100).toFixed(1)}pts`]);
  lines.push([]);

  // Staff performance
  lines.push(["=== STAFF PERFORMANCE ==="]);
  lines.push(["Name", "Role", "Transactions", "Revenue", "Avg Ticket", "Repeat Rate", "vs Last Week", "Hourly Rate"]);
  for (const s of staffStats) {
    const prev = prevMap.get(s.staffId);
    const delta = prev != null ? ((s.repeatRate - prev) * 100).toFixed(1) + "pts" : "N/A";
    lines.push([
      s.staff.displayName,
      s.staff.role || "",
      String(s.transactions),
      `$${s.revenue.toFixed(2)}`,
      `$${s.avgTicket.toFixed(2)}`,
      `${(s.repeatRate * 100).toFixed(1)}%`,
      delta,
      `$${s.staff.hourlyRate?.toFixed(2) || "N/A"}`,
    ]);
  }
  lines.push([]);

  // Shift performance
  lines.push(["=== SHIFT PROFITABILITY ==="]);
  lines.push(["Day", "Shift", "Revenue", "Labor Cost", "Labor %", "vs Target", "Transactions"]);
  for (const shift of shiftPerf) {
    const vsTarget = shift.laborPct > 0
      ? (shift.laborPct > org.laborCostTarget ? `OVER by ${((shift.laborPct - org.laborCostTarget) * 100).toFixed(1)}pts` : "OK")
      : "No data";
    lines.push([
      DAY_NAMES[shift.dayOfWeek],
      SHIFT_LABELS[shift.shiftSlot] || shift.shiftSlot,
      `$${shift.totalSales.toFixed(2)}`,
      `$${shift.laborCost.toFixed(2)}`,
      `${(shift.laborPct * 100).toFixed(1)}%`,
      vsTarget,
      String(shift.transactionCount),
    ]);
  }
  lines.push([]);

  // AI insights (if available)
  if (digest && Array.isArray(digest.insightsJson)) {
    lines.push(["=== AI INSIGHTS ==="]);
    const insights = digest.insightsJson as Array<{ title: string; body: string; action?: string }>;
    for (const insight of insights) {
      lines.push([`Insight: ${insight.title}`]);
      lines.push([`Detail: ${insight.body}`]);
      if (insight.action) lines.push([`Action: ${insight.action}`]);
      lines.push([]);
    }
  }

  const csv = lines.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const weekStr = weekOf.toISOString().split("T")[0];

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="strata-report-${weekStr}.csv"`,
    },
  });
}
