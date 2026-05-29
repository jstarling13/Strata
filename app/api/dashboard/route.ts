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

  const [staffStats, shiftPerf, latestDigest, dataSource] = await Promise.all([
    prisma.staffWeeklyStats.findMany({
      where: { orgId: org.id, weekOf },
      include: { staff: true },
      orderBy: { repeatRate: "desc" },
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
  ]);

  const totalRevenue = staffStats.reduce((s, m) => s + m.revenue, 0);
  const totalLaborCost = shiftPerf.reduce((s, m) => s + m.laborCost, 0);
  const laborPct = totalRevenue > 0 ? totalLaborCost / totalRevenue : 0;

  const topStaff = staffStats[0];
  const bestShift = [...shiftPerf].sort((a, b) => a.laborPct - b.laborPct)[0];

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      plan: org.plan,
      laborCostTarget: org.laborCostTarget,
      trialEndsAt: org.trialEndsAt,
    },
    overview: {
      weeklyRevenue: totalRevenue,
      laborPct,
      laborCostTarget: org.laborCostTarget,
      topStaff: topStaff
        ? { name: topStaff.staff.displayName, repeatRate: topStaff.repeatRate }
        : null,
      bestShift: bestShift ? { dayOfWeek: bestShift.dayOfWeek, shiftSlot: bestShift.shiftSlot } : null,
    },
    staffStats: staffStats.map((s) => ({
      id: s.staffId,
      name: s.staff.displayName,
      role: s.staff.role,
      transactions: s.transactions,
      avgTicket: s.avgTicket,
      repeatRate: s.repeatRate,
      revenue: s.revenue,
    })),
    shiftPerformance: shiftPerf,
    latestDigest,
    lastSyncAt: dataSource?.lastSyncAt,
  });
}
