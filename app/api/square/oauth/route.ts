import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSquareOAuthUrl } from "@/lib/square";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const state = Buffer.from(JSON.stringify({ orgId: org.id, userId })).toString("base64url");
  const url = getSquareOAuthUrl(state);

  return NextResponse.redirect(url);
}
