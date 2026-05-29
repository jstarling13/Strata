import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const digests = await prisma.weeklyDigest.findMany({
    where: { orgId: org.id },
    orderBy: { weekOf: "desc" },
    take: 52,
  });

  return NextResponse.json({ digests });
}
