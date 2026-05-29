import { prisma } from "@/lib/prisma";
import { startOfWeek } from "@/lib/utils";

type ShiftSlot = "morning" | "lunch" | "afternoon" | "evening";

const SHIFT_HOURS: Record<ShiftSlot, number> = {
  morning: 5,
  lunch: 3,
  afternoon: 3,
  evening: 5,
};

export async function runAttribution(orgId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    include: { staffMembers: true },
  });

  const avgHourlyRate =
    org.staffMembers.length > 0
      ? org.staffMembers.reduce((s, m) => s + m.hourlyRate, 0) / org.staffMembers.length
      : 15;

  // Build customer visit records from transactions
  const transactions = await prisma.transaction.findMany({
    where: { orgId },
    orderBy: { transactedAt: "asc" },
  });

  // Delete old customer visits for this org and rebuild
  await prisma.customerVisit.deleteMany({ where: { orgId } });

  const customerLastVisit: Record<string, Date> = {};

  for (const tx of transactions) {
    if (!tx.customerId) continue;
    const prior = customerLastVisit[tx.customerId];
    const isRepeat = prior !== undefined;

    await prisma.customerVisit.create({
      data: {
        orgId,
        customerId: tx.customerId,
        staffId: tx.staffId,
        visitAt: tx.transactedAt,
        saleAmount: tx.saleAmount,
        isRepeat,
      },
    });

    customerLastVisit[tx.customerId] = tx.transactedAt;
  }

  // Compute staff weekly stats
  const staffMap = new Map(org.staffMembers.map((s) => [s.id, s]));
  const weeklyStaffData: Record<
    string,
    { transactions: number; revenue: number; repeatCount: number; weekOf: Date }
  > = {};

  const visits = await prisma.customerVisit.findMany({ where: { orgId } });

  for (const visit of visits) {
    if (!visit.staffId) continue;
    const weekOf = startOfWeek(visit.visitAt);
    const key = `${visit.staffId}_${weekOf.toISOString()}`;

    if (!weeklyStaffData[key]) {
      weeklyStaffData[key] = { transactions: 0, revenue: 0, repeatCount: 0, weekOf };
    }
    weeklyStaffData[key].transactions++;
    weeklyStaffData[key].revenue += visit.saleAmount;
    if (visit.isRepeat) weeklyStaffData[key].repeatCount++;
  }

  for (const [key, data] of Object.entries(weeklyStaffData)) {
    const [staffId] = key.split("_");
    const repeatRate = data.transactions > 0 ? data.repeatCount / data.transactions : 0;
    const avgTicket = data.transactions > 0 ? data.revenue / data.transactions : 0;

    await prisma.staffWeeklyStats.upsert({
      where: { orgId_staffId_weekOf: { orgId, staffId, weekOf: data.weekOf } },
      create: {
        orgId,
        staffId,
        weekOf: data.weekOf,
        transactions: data.transactions,
        revenue: data.revenue,
        repeatCount: data.repeatCount,
        repeatRate,
        avgTicket,
      },
      update: {
        transactions: data.transactions,
        revenue: data.revenue,
        repeatCount: data.repeatCount,
        repeatRate,
        avgTicket,
      },
    });
  }

  // Compute shift performance by week
  const shiftData: Record<
    string,
    { totalSales: number; transactionCount: number; dayOfWeek: number; shiftSlot: ShiftSlot; weekOf: Date }
  > = {};

  for (const tx of transactions) {
    if (!tx.shiftSlot) continue;
    const weekOf = startOfWeek(tx.transactedAt);
    const dayOfWeek = tx.transactedAt.getDay();
    const key = `${orgId}_${dayOfWeek}_${tx.shiftSlot}_${weekOf.toISOString()}`;

    if (!shiftData[key]) {
      shiftData[key] = { totalSales: 0, transactionCount: 0, dayOfWeek, shiftSlot: tx.shiftSlot, weekOf };
    }
    shiftData[key].totalSales += tx.saleAmount;
    shiftData[key].transactionCount++;
  }

  for (const [, data] of Object.entries(shiftData)) {
    const shiftHours = SHIFT_HOURS[data.shiftSlot];
    const laborCost = shiftHours * avgHourlyRate * Math.max(1, Math.ceil(org.staffCount / 4));
    const laborPct = data.totalSales > 0 ? laborCost / data.totalSales : 1;

    await prisma.shiftPerformance.upsert({
      where: {
        orgId_dayOfWeek_shiftSlot_weekOf: {
          orgId,
          dayOfWeek: data.dayOfWeek,
          shiftSlot: data.shiftSlot,
          weekOf: data.weekOf,
        },
      },
      create: {
        orgId,
        dayOfWeek: data.dayOfWeek,
        shiftSlot: data.shiftSlot,
        weekOf: data.weekOf,
        totalSales: data.totalSales,
        laborCost,
        laborPct,
        transactionCount: data.transactionCount,
      },
      update: {
        totalSales: data.totalSales,
        laborCost,
        laborPct,
        transactionCount: data.transactionCount,
      },
    });
  }
}
