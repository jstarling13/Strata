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

  const fourWeeksAgo = new Date(weekOf);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const [staffStats, prevStaffStats, shiftPerf, latestDigest, dataSource, allDigests, revenueHistory] = await Promise.all([
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
    }),
    prisma.weeklyDigest.findFirst({
      where: { orgId: org.id },
      orderBy: { weekOf: "desc" },
    }),
    prisma.dataSource.findFirst({
      where: { orgId: org.id, status: "active" },
      orderBy: { lastSyncAt: "desc" },
    }),
    prisma.weeklyDigest.findMany({
      where: { orgId: org.id },
      orderBy: { weekOf: "desc" },
      take: 12,
      select: { id: true, weekOf: true, generatedAt: true },
    }),
    prisma.staffWeeklyStats.groupBy({
      by: ["weekOf"],
      where: { orgId: org.id, weekOf: { gte: fourWeeksAgo } },
      _sum: { revenue: true },
      orderBy: { weekOf: "asc" },
    }),
  ]);

  const totalRevenue = staffStats.reduce((s, m) => s + m.revenue, 0);
  const totalLaborCost = shiftPerf.reduce((s, m) => s + m.laborCost, 0);
  const laborPct = totalRevenue > 0 ? totalLaborCost / totalRevenue : 0;

  const prevRevenueMap = new Map(prevStaffStats.map((s) => [s.staffId, s]));
  const topStaff = staffStats[0];
  const bestShift = [...shiftPerf].sort((a, b) => a.laborPct - b.laborPct)[0];
  const worstShift = [...shiftPerf].sort((a, b) => b.laborPct - a.laborPct)[0];

  // Team avg repeat rate
  const teamAvgRepeatRate =
    staffStats.length > 0
      ? staffStats.reduce((s, m) => s + m.repeatRate, 0) / staffStats.length
      : 0;

  const prevTeamAvg =
    prevStaffStats.length > 0
      ? prevStaffStats.reduce((s, m) => s + m.repeatRate, 0) / prevStaffStats.length
      : null;

  const prevWeekRevenue = prevStaffStats.reduce((s, m) => s + m.revenue, 0);

  // Annual revenue opportunity: gap between top performer and below-median staff
  const topRepeatRate = topStaff?.repeatRate ?? 0;
  type StaffRow = (typeof staffStats)[number];
  const sortedByRepeat: StaffRow[] = [...staffStats].sort((a, b) => a.repeatRate - b.repeatRate);
  const medianRepeatRate = sortedByRepeat.length > 0
    ? sortedByRepeat[Math.floor(sortedByRepeat.length / 2)].repeatRate
    : 0;
  const belowMedianStaff: StaffRow[] = sortedByRepeat.filter((s) => s.repeatRate < medianRepeatRate);
  const annualRevenueOpportunity = staffStats.length >= 2 && topRepeatRate > 0
    ? Math.round(
        belowMedianStaff.reduce((sum: number, s: StaffRow) => {
          const gap = Math.max(0, topRepeatRate - s.repeatRate);
          return sum + s.revenue * gap * 0.25; // conservative 25% conversion factor
        }, 0) * 52
      )
    : 0;

  // Labor savings opportunity: weekly cost overrun vs target annualized
  const targetLaborCost = totalRevenue * org.laborCostTarget;
  const weeklyLaborOverrun = Math.max(0, totalLaborCost - targetLaborCost);
  const annualLaborSavings = Math.round(weeklyLaborOverrun * 52);

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      type: org.type,
      plan: org.plan,
      laborCostTarget: org.laborCostTarget,
      trialEndsAt: org.trialEndsAt,
    },
    overview: {
      weeklyRevenue: totalRevenue,
      prevWeekRevenue: prevStaffStats.length > 0 ? prevWeekRevenue : null,
      laborPct,
      laborCostTarget: org.laborCostTarget,
      teamAvgRepeatRate,
      prevTeamAvgRepeatRate: prevTeamAvg,
      topStaff: topStaff ? { name: topStaff.staff.displayName, repeatRate: topStaff.repeatRate } : null,
      bestShift: bestShift ? { dayOfWeek: bestShift.dayOfWeek, shiftSlot: bestShift.shiftSlot, laborPct: bestShift.laborPct } : null,
      worstShift: worstShift && worstShift.laborPct > org.laborCostTarget
        ? { dayOfWeek: worstShift.dayOfWeek, shiftSlot: worstShift.shiftSlot, laborPct: worstShift.laborPct }
        : null,
      annualRevenueOpportunity,
      annualLaborSavings,
    },
    staffStats: staffStats.map((s) => ({
      id: s.staffId,
      name: s.staff.displayName,
      role: s.staff.role,
      transactions: s.transactions,
      avgTicket: s.avgTicket,
      repeatRate: s.repeatRate,
      revenue: s.revenue,
      prevRepeatRate: prevRevenueMap.get(s.staffId)?.repeatRate ?? null,
    })),
    shiftPerformance: shiftPerf,
    latestDigest,
    allDigests,
    lastSyncAt: dataSource?.lastSyncAt,
    hasData: staffStats.length > 0 || shiftPerf.length > 0,
    revenueTrend: revenueHistory.map((r) => ({
      weekOf: r.weekOf,
      revenue: r._sum.revenue ?? 0,
    })),
  });
}
