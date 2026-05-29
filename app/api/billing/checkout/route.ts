import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json();
  if (!plan || !PLANS[plan as keyof typeof PLANS]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";
  const selectedPlan = PLANS[plan as keyof typeof PLANS];

  const session = await stripe.checkout.sessions.create({
    customer: org.stripeCustomerId || undefined,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
    },
    success_url: `${appUrl}/dashboard?upgraded=true`,
    cancel_url: `${appUrl}/dashboard/billing`,
    metadata: { orgId: org.id, plan },
  });

  return NextResponse.json({ url: session.url });
}
