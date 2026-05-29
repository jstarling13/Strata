import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const PRICE_MAP: Record<string, string | undefined> = {
  standard_monthly: process.env.STRIPE_STANDARD_PRICE_ID,
  standard_annual: process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID,
  plus_monthly: process.env.STRIPE_PLUS_PRICE_ID,
  plus_annual: process.env.STRIPE_PLUS_ANNUAL_PRICE_ID,
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, interval = "monthly" } = await req.json();
  if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const priceId = PRICE_MAP[`${plan}_${interval}`];
  // Fall back to monthly if annual price not yet configured
  const resolvedPrice = priceId || PRICE_MAP[`${plan}_monthly`];
  if (!resolvedPrice) return NextResponse.json({ error: "No price configured" }, { status: 400 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";

  const session = await stripe.checkout.sessions.create({
    customer: org.stripeCustomerId || undefined,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: resolvedPrice, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${appUrl}/dashboard?upgraded=true`,
    cancel_url: `${appUrl}/dashboard/billing`,
    metadata: { orgId: org.id, plan, interval },
  });

  return NextResponse.json({ url: session.url });
}
