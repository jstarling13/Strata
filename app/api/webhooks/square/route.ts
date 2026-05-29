import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAttribution } from "@/lib/agents/attribution";
import { getShiftSlot } from "@/lib/utils";
import crypto from "crypto";

function verifySquareWebhook(body: string, signature: string, notificationUrl: string): boolean {
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!secret) return false;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(notificationUrl + body)
    .digest("base64");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") || "";
  const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/square`;

  if (!verifySquareWebhook(body, signature, notificationUrl)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only handle completed orders
  if (event.type !== "order.fulfillment.updated" && event.type !== "payment.completed") {
    return NextResponse.json({ ok: true });
  }

  const merchantId = event.merchant_id;
  if (!merchantId) return NextResponse.json({ ok: true });

  const dataSource = await prisma.dataSource.findFirst({
    where: { type: "square", status: "active" },
    include: { org: true },
  });

  if (!dataSource) return NextResponse.json({ ok: true });

  try {
    const order = event.data?.object?.order_fulfillment_updated?.order || event.data?.object?.payment;
    if (!order) return NextResponse.json({ ok: true });

    const employeeId = order.tenders?.[0]?.employee_id || null;
    if (!employeeId) return NextResponse.json({ ok: true });

    const staff = await prisma.staffMember.findFirst({
      where: { orgId: dataSource.orgId, externalId: employeeId },
    });
    if (!staff) return NextResponse.json({ ok: true });

    const saleAmount = (order.total_money?.amount || 0) / 100;
    const tip = (order.total_tip_money?.amount || 0) / 100;
    const customerId = order.customer_id || `anon_${order.id}`;
    const createdAt = new Date(order.created_at || Date.now());

    await prisma.transaction.upsert({
      where: { id: order.id },
      create: {
        id: order.id,
        orgId: dataSource.orgId,
        staffId: staff.id,
        customerId,
        saleAmount,
        tip,
        transactedAt: createdAt,
        shiftSlot: getShiftSlot(createdAt.getHours()),
      },
      update: {},
    });

    // Incremental attribution for just this new transaction
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    await runAttribution(dataSource.orgId, oneMinuteAgo);

    await prisma.dataSource.update({
      where: { id: dataSource.id },
      data: { lastSyncAt: new Date() },
    });
  } catch (err) {
    console.error("Square webhook processing error:", err);
  }

  return NextResponse.json({ ok: true });
}
