import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const dataSource = await prisma.dataSource.findFirst({
    where: { orgId: org.id, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  // Count referrals
  const referralCount = await prisma.organization.count({
    where: { referredByOrgId: org.id },
  });
  const convertedReferralCount = await prisma.organization.count({
    where: { referredByOrgId: org.id, plan: { in: ["standard", "plus"] } },
  });

  return NextResponse.json({
    org: {
      id: org.id,
      name: org.name,
      type: org.type,
      laborCostTarget: org.laborCostTarget,
      plan: org.plan,
      trialEndsAt: org.trialEndsAt,
      digestDay: org.digestDay,
      alertEmailEnabled: org.alertEmailEnabled,
      alertThreshold: org.alertThreshold,
    },
    dataSource: dataSource
      ? { type: dataSource.type, lastSyncAt: dataSource.lastSyncAt, status: dataSource.status }
      : null,
    referrals: {
      total: referralCount,
      converted: convertedReferralCount,
      creditsEarned: convertedReferralCount, // 1 month per converted referral
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const body = await req.json();
  const { name, laborCostTarget, digestDay, alertEmailEnabled, alertThreshold } = body;

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: {
      ...(name ? { name } : {}),
      ...(laborCostTarget != null ? { laborCostTarget } : {}),
      ...(digestDay != null ? { digestDay } : {}),
      ...(alertEmailEnabled != null ? { alertEmailEnabled } : {}),
      ...(alertThreshold != null ? { alertThreshold } : {}),
    },
  });

  return NextResponse.json({
    ok: true,
    org: {
      name: updated.name,
      laborCostTarget: updated.laborCostTarget,
      digestDay: updated.digestDay,
      alertEmailEnabled: updated.alertEmailEnabled,
      alertThreshold: updated.alertThreshold,
    },
  });
}
