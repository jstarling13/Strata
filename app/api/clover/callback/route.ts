import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const merchantId = searchParams.get("merchant_id");
  const userId = searchParams.get("state");

  if (!code || !merchantId || !userId) {
    return NextResponse.redirect(new URL("/onboarding?error=clover_failed", req.url));
  }

  const appId = process.env.CLOVER_APP_ID!;
  const appSecret = process.env.CLOVER_APP_SECRET!;

  const tokenRes = await fetch(
    `https://sandbox.dev.clover.com/oauth/token?client_id=${appId}&client_secret=${appSecret}&code=${code}`
  );
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    return NextResponse.redirect(new URL("/onboarding?error=clover_token_failed", req.url));
  }

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.redirect(new URL("/onboarding", req.url));

  const existing = await prisma.dataSource.findFirst({ where: { orgId: org.id, type: "clover" } });

  if (existing) {
    await prisma.dataSource.update({
      where: { id: existing.id },
      data: { status: "active", credentials: { accessToken: tokenData.access_token, merchantId } },
    });
  } else {
    await prisma.dataSource.create({
      data: {
        orgId: org.id,
        type: "clover",
        status: "active",
        credentials: { accessToken: tokenData.access_token, merchantId },
      },
    });
  }

  return NextResponse.redirect(new URL("/onboarding?step=3&connected=clover", req.url));
}
