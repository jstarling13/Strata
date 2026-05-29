import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { apiKey } = await req.json();
  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  // Validate API key against Toast API
  try {
    const res = await fetch(`${process.env.TOAST_API_BASE}/restaurants/v1/restaurants`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Toast-Restaurant-External-ID": "all",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Invalid Toast API key" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Could not reach Toast API" }, { status: 502 });
  }

  await prisma.dataSource.upsert({
    where: { id: `toast_${org.id}` },
    create: {
      id: `toast_${org.id}`,
      orgId: org.id,
      type: "toast",
      credentials: { apiKey },
      status: "active",
      lastSyncAt: new Date(),
    },
    update: { credentials: { apiKey }, status: "active", lastSyncAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
