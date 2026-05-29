import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { normalizeSquareData } from "@/lib/agents/normalize";
import { normalizeCloverData } from "@/lib/agents/normalize-clover";
import { runAttribution } from "@/lib/agents/attribution";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const dataSource = await prisma.dataSource.findFirst({
    where: { orgId: org.id, status: "active" },
  });

  if (!dataSource) return NextResponse.json({ error: "No active data source" }, { status: 404 });

  try {
    if (dataSource.type === "square") {
      const { accessToken } = dataSource.credentials as { accessToken: string };
      await normalizeSquareData(org.id, accessToken);
    } else if (dataSource.type === "clover") {
      const { accessToken, merchantId } = dataSource.credentials as { accessToken: string; merchantId: string };
      await normalizeCloverData(org.id, accessToken, merchantId);
    }

    // Pass lastSyncAt so attribution runs incrementally (only new transactions)
    await runAttribution(org.id, dataSource.lastSyncAt ?? undefined);

    await prisma.dataSource.update({
      where: { id: dataSource.id },
      data: { lastSyncAt: new Date(), status: "active" },
    });

    return NextResponse.json({ ok: true, syncedAt: new Date() });
  } catch (err: any) {
    await prisma.dataSource.update({
      where: { id: dataSource.id },
      data: { status: "error" },
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
