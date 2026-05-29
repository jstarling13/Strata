import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWeeklyDigestEmail } from "@/lib/agents/insights";

// Triggered by Railway cron — every Sunday at 11pm UTC
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgs = await prisma.organization.findMany({
    where: {
      status: "active",
      onboardingDone: true,
      plan: { in: ["standard", "plus"] },
    },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    orgs.map((org) => sendWeeklyDigestEmail(org.id))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ succeeded, failed, total: orgs.length });
}

// Manual trigger for a specific org (admin use)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

  try {
    const { generateWeeklyDigest } = await import("@/lib/agents/insights");
    const result = await generateWeeklyDigest(orgId);
    return NextResponse.json({ ok: true, digestId: result.digest.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
