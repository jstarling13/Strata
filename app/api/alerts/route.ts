import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const alerts = await prisma.anomalyAlert.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // For the upgrade CTA: surface over-target shifts even for non-Plus
  const weekOf = startOfWeek(new Date());
  const overTargetShifts = await prisma.shiftPerformance.findMany({
    where: {
      orgId: org.id,
      weekOf,
      laborPct: { gt: org.laborCostTarget * 1.2 },
    },
    orderBy: { laborPct: "desc" },
    take: 3,
  });

  const staffStats = await prisma.staffWeeklyStats.findMany({
    where: { orgId: org.id, weekOf },
    include: { staff: true },
    orderBy: { repeatRate: "desc" },
  });

  const prevWeek = new Date(weekOf);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const prevStaffStats = await prisma.staffWeeklyStats.findMany({
    where: { orgId: org.id, weekOf: prevWeek },
  });

  const prevMap = new Map(prevStaffStats.map((s) => [s.staffId, s.repeatRate]));
  const bigDroppers = staffStats
    .filter((s) => {
      const prev = prevMap.get(s.staffId);
      return prev != null && s.repeatRate - prev < -0.1;
    })
    .map((s) => ({ name: s.staff.displayName, drop: prevMap.get(s.staffId)! - s.repeatRate }))
    .slice(0, 2);

  return NextResponse.json({
    alerts,
    plan: org.plan,
    preview: {
      overTargetShiftCount: overTargetShifts.length,
      bigDropperCount: bigDroppers.length,
      bigDroppers,
    },
  });
}
