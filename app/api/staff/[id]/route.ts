import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const staff = await prisma.staffMember.findFirst({
    where: { id: params.id, orgId: org.id },
  });
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const weeklyStats = await prisma.staffWeeklyStats.findMany({
    where: { staffId: params.id, orgId: org.id },
    orderBy: { weekOf: "asc" },
    take: 8,
  });

  const visits = await prisma.customerVisit.findMany({
    where: { staffId: params.id, orgId: org.id },
    orderBy: { visitAt: "desc" },
    take: 100,
  });

  const totalRevenue = weeklyStats.reduce((s, w) => s + w.revenue, 0);
  const totalTransactions = weeklyStats.reduce((s, w) => s + w.transactions, 0);
  const avgRepeatRate =
    weeklyStats.length > 0
      ? weeklyStats.reduce((s, w) => s + w.repeatRate, 0) / weeklyStats.length
      : 0;

  return NextResponse.json({
    staff,
    weeklyStats,
    summary: { totalRevenue, totalTransactions, avgRepeatRate },
    recentVisits: visits.slice(0, 20),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await req.json();
  const { displayName, role, hourlyRate } = body;

  const staff = await prisma.staffMember.updateMany({
    where: { id: params.id, orgId: org.id },
    data: { displayName, role, hourlyRate },
  });

  return NextResponse.json({ ok: true });
}
