import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgs = await prisma.organization.findMany({
    include: {
      dataSources: { select: { type: true, status: true, lastSyncAt: true } },
      weeklyDigests: { orderBy: { weekOf: "desc" }, take: 1 },
      anomalyAlerts: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });

  const mrr = orgs.reduce((sum, org) => {
    if (org.plan === "standard") return sum + 129;
    if (org.plan === "plus") return sum + 229;
    return sum;
  }, 0);

  return NextResponse.json({ orgs, mrr, total: orgs.length });
}
