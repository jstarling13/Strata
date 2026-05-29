import { prisma } from "@/lib/prisma";
import { getSquareClient } from "@/lib/square";
import { getShiftSlot } from "@/lib/utils";

export async function normalizeSquareData(orgId: string, accessToken: string) {
  const client = getSquareClient(accessToken);

  const since = new Date();
  since.setDate(since.getDate() - 90);

  // Fetch orders from Square
  let cursor: string | undefined;
  const allOrders: any[] = [];

  do {
    const response = await client.ordersApi.searchOrders({
      locationIds: [],
      query: {
        filter: {
          dateTimeFilter: {
            createdAt: { startAt: since.toISOString() },
          },
          stateFilter: { states: ["COMPLETED"] },
        },
      },
      cursor,
      limit: 500,
    });
    allOrders.push(...(response.result.orders || []));
    cursor = response.result.cursor;
  } while (cursor);

  // Fetch team members
  const teamRes = await client.teamApi.searchTeamMembers({ query: {} });
  const teamMembers = teamRes.result.teamMembers || [];

  // Upsert staff members
  for (const member of teamMembers) {
    if (!member.id || !member.displayName) continue;
    await prisma.staffMember.upsert({
      where: { id: `${orgId}_${member.id}` },
      create: {
        id: `${orgId}_${member.id}`,
        orgId,
        externalId: member.id,
        displayName: member.displayName,
        role: member.jobAssignments?.[0]?.jobTitle || "Staff",
        hourlyRate: 15,
      },
      update: { displayName: member.displayName },
    });
  }

  // Create transactions
  for (const order of allOrders) {
    if (!order.id || !order.createdAt) continue;
    const date = new Date(order.createdAt);
    const slot = getShiftSlot(date.getHours());
    const staffExternalId = order.fulfillments?.[0]?.teamMemberId || null;
    const staffMember = staffExternalId
      ? await prisma.staffMember.findFirst({ where: { orgId, externalId: staffExternalId } })
      : null;

    const amount = Number(order.totalMoney?.amount || 0) / 100;
    const tip = Number(order.totalTipMoney?.amount || 0) / 100;
    const customerId = order.customerId || null;

    await prisma.transaction.upsert({
      where: { id: order.id },
      create: {
        id: order.id,
        orgId,
        staffId: staffMember?.id || null,
        customerId,
        saleAmount: amount,
        tip,
        transactedAt: date,
        locationId: order.locationId || null,
        shiftSlot: slot,
      },
      update: {},
    });
  }
}

export async function normalizeCSVData(
  orgId: string,
  rows: Record<string, string>[],
  columnMap: {
    staffId?: string;
    customerId?: string;
    amount: string;
    tip?: string;
    timestamp: string;
  }
) {
  for (const row of rows) {
    const date = new Date(row[columnMap.timestamp]);
    if (isNaN(date.getTime())) continue;

    const slot = getShiftSlot(date.getHours());
    const externalStaffId = columnMap.staffId ? row[columnMap.staffId] : null;

    let staffMember = null;
    if (externalStaffId) {
      staffMember = await prisma.staffMember.findFirst({
        where: { orgId, externalId: externalStaffId },
      });
      if (!staffMember) {
        staffMember = await prisma.staffMember.create({
          data: {
            orgId,
            externalId: externalStaffId,
            displayName: externalStaffId,
            role: "Staff",
            hourlyRate: 15,
          },
        });
      }
    }

    const amount = parseFloat(row[columnMap.amount]?.replace(/[$,]/g, "") || "0");
    const tip = columnMap.tip ? parseFloat(row[columnMap.tip]?.replace(/[$,]/g, "") || "0") : 0;
    const customerId = columnMap.customerId ? row[columnMap.customerId] : null;

    await prisma.transaction.create({
      data: {
        orgId,
        staffId: staffMember?.id || null,
        customerId,
        saleAmount: isNaN(amount) ? 0 : amount,
        tip: isNaN(tip) ? 0 : tip,
        transactedAt: date,
        shiftSlot: slot,
      },
    });
  }
}
