import { prisma } from "@/lib/prisma";
import { startOfWeek } from "@/lib/utils";

type ShiftSlot = "morning" | "lunch" | "afternoon" | "evening";

const SHIFT_HOURS: Record<ShiftSlot, number> = {
  morning: 5,
  lunch: 3,
  afternoon: 3,
  evening: 5,
};

export async function runAttribution(orgId: string, since?: Date) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    include: { staffMembers: true },
  });

  const avgHourlyRate =
    org.staffMembers.length > 0
      ? org.staffMembers.reduce((s, m) => s + m.hourlyRate, 0) / org.staffMembers.length
      : 15;

  // Incremental: only process transactions newer than the last attribution run
  // Load the full history to establish repeat context, but only process new transactions
  const allTransactions = await prisma.transaction.findMany({
    where: { orgId },
    orderBy: { transactedAt: "asc" },
  });

  // Build customer first-seen map from ALL transactions (for correct repeat detection)
  const customerFirstSeen: Record<string, Date> = {};
  for (const tx of allTransactions) {
    if (!tx.customerId) continue;
    if (!customerFirstSeen[tx.customerId]) {
      customerFirstSeen[tx.customerId] = tx.transactedAt;
    }
  }

  // Only upsert CustomerVisit records for new transactions
  const newTransactions = since
    ? allTransactions.filter((tx) => tx.transactedAt > since)
    : allTransactions;

  // For full rebuild (no `since`), clear existing visits first
  if (!since) {
    await prisma.customerVisit.deleteMany({ where: { orgId } });
  }

  // Track the last-seen date per customer as we process new records
  const customerLastVisit: Record<string, Date> = {};

  // Pre-populate from existing visits when doing incremental
  if (since) {
    const existingVisits = await prisma.customerVisit.findMany({
      where: { orgId, visitAt: { lt: since } },
      orderBy: { visitAt: "asc" },
    });
    for (const v of existingVisits) {
      customerLastVisit[v.customerId] = v.visitAt;
    }
  } else {
    // Full rebuild — walk in order building the map
    for (const tx of allTransactions) {
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
  }

  // Process new transactions incrementally
  if (since) {
    for (const tx of newTransactions) {
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
  }

  // Recompute staff weekly stats for affected weeks only
  const affectedWeeks = new Set<string>();
  const txsToProcess = since ? newTransactions : allTransactions;
  for (const tx of txsToProcess) {
    affectedWeeks.add(startOfWeek(tx.transactedAt).toISOString());
  }

  for (const weekStr of affectedWeeks) {
    const weekOf = new Date(weekStr);
    const weekEnd = new Date(weekOf);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekVisits = await prisma.customerVisit.findMany({
      where: { orgId, visitAt: { gte: weekOf, lt: weekEnd } },
    });

    const weeklyStaffData: Record<string, { transactions: number; revenue: number; repeatCount: number }> = {};

    for (const visit of weekVisits) {
      if (!visit.staffId) continue;
      if (!weeklyStaffData[visit.staffId]) {
        weeklyStaffData[visit.staffId] = { transactions: 0, revenue: 0, repeatCount: 0 };
      }
      weeklyStaffData[visit.staffId].transactions++;
      weeklyStaffData[visit.staffId].revenue += visit.saleAmount;
      if (visit.isRepeat) weeklyStaffData[visit.staffId].repeatCount++;
    }

    for (const [staffId, data] of Object.entries(weeklyStaffData)) {
      const repeatRate = data.transactions > 0 ? data.repeatCount / data.transactions : 0;
      const avgTicket = data.transactions > 0 ? data.revenue / data.transactions : 0;

      await prisma.staffWeeklyStats.upsert({
        where: { orgId_staffId_weekOf: { orgId, staffId, weekOf } },
        create: { orgId, staffId, weekOf, transactions: data.transactions, revenue: data.revenue, repeatCount: data.repeatCount, repeatRate, avgTicket },
        update: { transactions: data.transactions, revenue: data.revenue, repeatCount: data.repeatCount, repeatRate, avgTicket },
      });
    }

    // Shift performance for this week
    const weekTxs = allTransactions.filter(
      (tx) => tx.transactedAt >= weekOf && tx.transactedAt < weekEnd && tx.shiftSlot
    );

    const shiftData: Record<string, { totalSales: number; transactionCount: number; dayOfWeek: number; shiftSlot: ShiftSlot }> = {};
    for (const tx of weekTxs) {
      if (!tx.shiftSlot) continue;
      const dayOfWeek = tx.transactedAt.getDay();
      const key = `${dayOfWeek}_${tx.shiftSlot}`;
      if (!shiftData[key]) shiftData[key] = { totalSales: 0, transactionCount: 0, dayOfWeek, shiftSlot: tx.shiftSlot as ShiftSlot };
      shiftData[key].totalSales += tx.saleAmount;
      shiftData[key].transactionCount++;
    }

    for (const [, data] of Object.entries(shiftData)) {
      const shiftHours = SHIFT_HOURS[data.shiftSlot];
      const laborCost = shiftHours * avgHourlyRate * Math.max(1, Math.ceil(org.staffCount / 4));
      const laborPct = data.totalSales > 0 ? laborCost / data.totalSales : 1;

      await prisma.shiftPerformance.upsert({
        where: { orgId_dayOfWeek_shiftSlot_weekOf: { orgId, dayOfWeek: data.dayOfWeek, shiftSlot: data.shiftSlot, weekOf } },
        create: { orgId, dayOfWeek: data.dayOfWeek, shiftSlot: data.shiftSlot, weekOf, totalSales: data.totalSales, laborCost, laborPct, transactionCount: data.transactionCount },
        update: { totalSales: data.totalSales, laborCost, laborPct, transactionCount: data.transactionCount },
      });
    }
  }
}
