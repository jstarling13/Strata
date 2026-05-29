import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAnomalyCheck } from "@/lib/agents/anomaly";

// Triggered by Railway cron — every day at 8am UTC
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgs = await prisma.organization.findMany({
    where: { status: "active", onboardingDone: true, plan: "plus" },
    select: { id: true },
  });

  const results = await Promise.allSettled(orgs.map((org) => runAnomalyCheck(org.id)));

  return NextResponse.json({
    succeeded: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  });
}
