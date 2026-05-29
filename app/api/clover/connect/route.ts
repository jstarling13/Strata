import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Clover OAuth entry point
// Clover uses standard OAuth 2.0 with merchant_id scoped tokens
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  const appId = process.env.CLOVER_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "Clover integration not configured" }, { status: 503 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/clover/callback`;
  const state = userId;

  const url = new URL("https://sandbox.dev.clover.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
