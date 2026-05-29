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
    await prisma.staffMember.upsert({
      where: { orgId_externalId: { orgId, externalId: emp.id } },
      create: {
        orgId,
        externalId: emp.id,
        displayName: `${emp.name || emp.nickname || "Unknown"}`,
        role: emp.role?.systemRole || "Staff",
        hourlyRate: 15,
      },
      update: {
        displayName: `${emp.name || emp.nickname || "Unknown"}`,
      },
    });
  }

  // Fetch orders (Clover calls them "orders")
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const ordersData = await cloverFetch(
      `/v3/merchants/${merchantId}/orders?filter=createdTime>=${sinceMs}&expand=lineItems,employees&limit=${limit}&offset=${offset}`,
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

      const amount = (order.total || 0) / 100; // Clover amounts are in cents
      if (amount <= 0) continue;

      const createdAt = new Date(order.createdTime);
      const customerId = order.customer?.id || `anon_${order.id}`;

      await prisma.transaction.upsert({
        where: { orgId_externalId: { orgId, externalId: order.id } },
        create: {
          orgId,
          externalId: order.id,
          staffId: staffMember.id,
          customerId,
          amount,
          tip: (order.serviceCharge?.amount || 0) / 100,
          transactedAt: createdAt,
          shiftSlot: getShiftSlot(createdAt.getHours()),
          dayOfWeek: createdAt.getDay(),
        },
        update: {},
      });
    }
  }
}
