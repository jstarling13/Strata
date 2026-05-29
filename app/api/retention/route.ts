import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const allVisits = await prisma.customerVisit.findMany({
    where: { orgId: org.id, visitAt: { gte: eightWeeksAgo } },
    select: { visitAt: true, isRepeat: true, saleAmount: true },
    orderBy: { visitAt: "asc" },
  });

  const weekMap = new Map<string, { newCount: number; repeatCount: number; newRevenue: number; repeatRevenue: number }>();

  for (const visit of allVisits) {
    const weekOf = startOfWeek(new Date(visit.visitAt)).toISOString().split("T")[0];
    if (!weekMap.has(weekOf)) {
      weekMap.set(weekOf, { newCount: 0, repeatCount: 0, newRevenue: 0, repeatRevenue: 0 });
    }
    const week = weekMap.get(weekOf)!;
    if (visit.isRepeat) {
      week.repeatCount++;
      week.repeatRevenue += visit.saleAmount;
    } else {
      week.newCount++;
      week.newRevenue += visit.saleAmount;
    }
  }

  const weeks = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekOf, data]) => ({
      weekOf,
      newCount: data.newCount,
      repeatCount: data.repeatCount,
      total: data.newCount + data.repeatCount,
      repeatRate: data.newCount + data.repeatCount > 0 ? data.repeatCount / (data.newCount + data.repeatCount) : 0,
      newRevenue: data.newRevenue,
      repeatRevenue: data.repeatRevenue,
      totalRevenue: data.newRevenue + data.repeatRevenue,
    }));

  const totalVisits = allVisits.length;
  const repeatVisits = allVisits.filter((v) => v.isRepeat).length;
  const totalRevenue = allVisits.reduce((s, v) => s + v.saleAmount, 0);
  const repeatRevenue = allVisits.filter((v) => v.isRepeat).reduce((s, v) => s + v.saleAmount, 0);

  return NextResponse.json({
    weeks,
    summary: {
      totalVisits,
      repeatVisits,
      overallRepeatRate: totalVisits > 0 ? repeatVisits / totalVisits : 0,
      totalRevenue,
      repeatRevenue,
      repeatRevenuePct: totalRevenue > 0 ? repeatRevenue / totalRevenue : 0,
    },
  });
}
