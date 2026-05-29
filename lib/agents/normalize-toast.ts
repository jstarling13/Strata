import { prisma } from "@/lib/prisma";
import { getShiftSlot } from "@/lib/utils";

const TOAST_BASE = process.env.TOAST_API_BASE || "https://ws-sandbox-api.eng.toasttab.com";

async function toastFetch(path: string, apiKey: string) {
  const res = await fetch(`${TOAST_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Toast API error ${res.status}: ${path}`);
  return res.json();
}

export async function normalizeToastData(orgId: string, apiKey: string) {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  // Fetch restaurant config to get restaurant GUIDs
  let restaurants: any[] = [];
  try {
    const restaurantData = await toastFetch("/restaurants/v1/restaurants", apiKey);
    restaurants = Array.isArray(restaurantData) ? restaurantData : [restaurantData];
  } catch {
    return;
  }

  for (const restaurant of restaurants) {
    const restaurantGuid = restaurant.guid || restaurant.restaurantGuid;
    if (!restaurantGuid) continue;

    // Fetch employees
    try {
      const employeeData = await toastFetch(
        `/labor/v1/employees?restaurantGuid=${restaurantGuid}`,
        apiKey
      );
      const employees = Array.isArray(employeeData) ? employeeData : (employeeData.employees || []);

      for (const emp of employees) {
        const empId = emp.guid || emp.employeeGuid;
        if (!empId) continue;

        const displayName = [emp.firstName, emp.lastName].filter(Boolean).join(" ") || empId;
        const existing = await prisma.staffMember.findFirst({ where: { orgId, externalId: empId } });

        if (existing) {
          await prisma.staffMember.update({ where: { id: existing.id }, data: { displayName } });
        } else {
          await prisma.staffMember.create({
            data: {
              orgId,
              externalId: empId,
              displayName,
              role: emp.jobReferences?.[0]?.title || "Staff",
              hourlyRate: 15,
            },
          });
        }
      }
    } catch {
      // Not all Toast configurations expose employee endpoints
    }

    // Fetch orders (Toast calls them "orders")
    const startDate = since.toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    try {
      const orderData = await toastFetch(
        `/orders/v2/orders?restaurantGuid=${restaurantGuid}&startDate=${startDate}&endDate=${endDate}&pageSize=100`,
        apiKey
      );
      const orders = Array.isArray(orderData) ? orderData : (orderData.orders || []);

      for (const order of orders) {
        const orderId = order.guid || order.orderGuid;
        if (!orderId || order.voided) continue;

        const checks = order.checks || [];
        for (const check of checks) {
          const employeeGuid = check.appliedServiceCharges?.[0]?.chargeForEmployeeGuid
            || order.server?.guid
            || null;

          let staffMember = null;
          if (employeeGuid) {
            staffMember = await prisma.staffMember.findFirst({
              where: { orgId, externalId: employeeGuid },
            });
          }

          const saleAmount = (check.totalAmount || 0);
          if (saleAmount <= 0) continue;

          const createdAt = new Date(order.openedDate || order.createdDate || Date.now());
          const customerId = check.customer?.guid || `anon_${orderId}_${check.guid}`;
          const txId = `toast_${check.guid || orderId}`;

          await prisma.transaction.upsert({
            where: { id: txId },
            create: {
              id: txId,
              orgId,
              staffId: staffMember?.id || null,
              customerId,
              saleAmount,
              tip: check.totalWithTax ? check.totalWithTax - check.totalAmount : 0,
              transactedAt: createdAt,
              shiftSlot: getShiftSlot(createdAt.getHours()),
            },
            update: {},
          });
        }
      }
    } catch (err) {
      console.error("Toast order fetch error:", err);
    }
  }
}
