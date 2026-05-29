import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  switch (event.type) {
    case "checkout.session.completed": {
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = sub.items.data[0].price.id;
      const plan = priceId === process.env.STRIPE_PLUS_PRICE_ID ? "plus" : "standard";

      await prisma.organization.updateMany({
        where: { stripeCustomerId: session.customer as string },
        data: { stripeSubId: sub.id, plan, status: "active" },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0].price.id;
      const plan = priceId === process.env.STRIPE_PLUS_PRICE_ID ? "plus" : "standard";
      const status = sub.status === "active" ? "active" : sub.status;

      await prisma.organization.updateMany({
        where: { stripeCustomerId: sub.customer as string },
        data: { stripeSubId: sub.id, plan, status },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.organization.updateMany({
        where: { stripeCustomerId: sub.customer as string },
        data: { plan: "cancelled", status: "cancelled" },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await prisma.organization.updateMany({
        where: { stripeCustomerId: invoice.customer as string },
        data: { status: "past_due" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
