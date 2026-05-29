import { NextRequest, NextResponse } from "next/server";
import { exchangeSquareCode } from "@/lib/square";
import { prisma } from "@/lib/prisma";
import { normalizeSquareData } from "@/lib/agents/normalize";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=oauth_failed`);
  }

  let orgId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    orgId = decoded.orgId;
  } catch {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=invalid_state`);
  }

  try {
    const accessToken = await exchangeSquareCode(code);

    await prisma.dataSource.upsert({
      where: { id: `square_${orgId}` },
      create: {
        id: `square_${orgId}`,
        orgId,
        type: "square",
        credentials: { accessToken },
        status: "active",
        lastSyncAt: new Date(),
      },
      update: { credentials: { accessToken }, status: "active", lastSyncAt: new Date() },
    });

    // Kick off background normalization
    normalizeSquareData(orgId, accessToken).catch(console.error);

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?step=3&connected=square`);
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/onboarding?error=token_exchange`);
  }
}
