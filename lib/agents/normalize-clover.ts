import { prisma } from "@/lib/prisma";
import { getShiftSlot } from "@/lib/utils";

const CLOVER_BASE = process.env.CLOVER_API_BASE || "https://sandbox.dev.clover.com";

async function cloverFetch(path: string, accessToken: string) {
  const res = await fetch(`${CLOVER_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Clover API error ${res.status}: ${path}`);
  return res.json();
}

export async function normalizeCloverData(orgId: string, accessToken: string, merchantId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceMs = since.getTime();

  // Fetch employees
  const empData = await cloverFetch(`/v3/merchants/${merchantId}/employees?limit=200`, accessToken);
  const employees: any[] = empData.elements || [];

  for (const emp of employees) {
    const existing = await prisma.staffMember.findFirst({ where: { orgId, externalId: emp.id } });
    const displayName = emp.name || emp.nickname || "Unknown";
    if (existing) {
      await prisma.staffMember.update({ where: { id: existing.id }, data: { displayName } });
    } else {
      await prisma.staffMember.create({
        data: {
          orgId,
          externalId: emp.id,
          displayName,
          role: emp.role?.systemRole || "Staff",
          hourlyRate: 15,
        },
      });
    }
  }

  // Fetch orders
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const ordersData = await cloverFetch(
      `/v3/merchants/${merchantId}/orders?filter=createdTime>=${sinceMs}&expand=employees&limit=${limit}&offset=${offset}`,
      accessToken
    );

    const orders: any[] = ordersData.elements || [];
    hasMore = orders.length === limit;
    offset += orders.length;

    for (const order of orders) {
      if (!order.employee?.id) continue;

      const staffMember = await prisma.staffMember.findFirst({
        where: { orgId, externalId: order.employee.id },
      });
      if (!staffMember) continue;

      const saleAmount = (order.total || 0) / 100;
      if (saleAmount <= 0) continue;

      const createdAt = new Date(order.createdTime);
      const customerId = order.customer?.id || `anon_${order.id}`;
      const txId = `clover_${order.id}`;

      await prisma.transaction.upsert({
        where: { id: txId },
        create: {
          id: txId,
          orgId,
          staffId: staffMember.id,
          customerId,
          saleAmount,
          tip: (order.serviceCharge?.amount || 0) / 100,
          transactedAt: createdAt,
          shiftSlot: getShiftSlot(createdAt.getHours()),
        },
        update: {},
      });
    }
  }
}
