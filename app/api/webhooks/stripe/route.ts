import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { resend, FROM } from "@/lib/resend";
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
      const plusPrices = new Set([
        process.env.STRIPE_PLUS_PRICE_ID,
        process.env.STRIPE_PLUS_ANNUAL_PRICE_ID,
      ].filter(Boolean));
      const plan = plusPrices.has(priceId) ? "plus" : "standard";

      await prisma.organization.updateMany({
        where: { stripeCustomerId: session.customer as string },
        data: { stripeSubId: sub.id, plan, status: "active" },
      });

      // Referral credit — notify the referrer when their referred org upgrades for the first time
      try {
        const upgradedOrg = await prisma.organization.findFirst({
          where: { stripeCustomerId: session.customer as string },
        });
        if (upgradedOrg?.referredByOrgId) {
          const referrer = await prisma.organization.findUnique({
            where: { id: upgradedOrg.referredByOrgId },
          });
          if (referrer) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";
            // Get referrer email via Clerk
            const { createClerkClient } = await import("@clerk/nextjs/server");
            const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
            const clerkUser = await clerk.users.getUser(referrer.clerkUserId);
            const referrerEmail = clerkUser.emailAddresses[0]?.emailAddress;
            if (referrerEmail) {
              await resend.emails.send({
                from: FROM,
                to: referrerEmail,
                subject: `🎁 You earned 1 free month — ${upgradedOrg.name} just upgraded Strata`,
                html: buildReferralCreditEmail({
                  referrerName: clerkUser.firstName ?? referrer.name,
                  referredOrgName: upgradedOrg.name,
                  appUrl,
                }),
              });
            }
          }
        }
      } catch {
        // Non-critical — don't fail the webhook
      }

      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0].price.id;
      const plusPrices = new Set([
        process.env.STRIPE_PLUS_PRICE_ID,
        process.env.STRIPE_PLUS_ANNUAL_PRICE_ID,
      ].filter(Boolean));
      const plan = plusPrices.has(priceId) ? "plus" : "standard";
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

function buildReferralCreditEmail({
  referrerName,
  referredOrgName,
  appUrl,
}: {
  referrerName: string;
  referredOrgName: string;
  appUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;margin:0;padding:0;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">

    <div style="margin-bottom:28px;">
      <span style="color:#3B82F6;font-size:20px;font-weight:800;">Strata</span>
    </div>

    <div style="background:linear-gradient(135deg,#172554,#1e293b);border:1px solid #3b82f644;border-radius:16px;padding:28px;margin-bottom:24px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">🎁</div>
      <h1 style="color:#f1f5f9;font-size:24px;font-weight:800;margin:0 0 8px;line-height:1.3;">
        You earned 1 free month!
      </h1>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;line-height:1.6;">
        ${referredOrgName} just upgraded to a paid Strata plan through your referral link.
      </p>
      <div style="background:#3b82f622;border:1px solid #3b82f644;border-radius:10px;padding:16px;">
        <div style="color:#93c5fd;font-size:13px;font-weight:600;">1 month free applied to your account</div>
        <div style="color:#64748b;font-size:12px;margin-top:4px;">We'll apply the credit on your next billing cycle. No action needed.</div>
      </div>
    </div>

    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Hi ${referrerName}, thanks for spreading the word about Strata.
      Keep sharing — every owner who upgrades through your link earns you another free month.
    </p>

    <div style="margin-bottom:32px;">
      <a href="${appUrl}/dashboard/settings" style="background:#3B82F6;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
        View your referral stats →
      </a>
    </div>

    <p style="color:#475569;font-size:12px;border-top:1px solid #1e293b;padding-top:20px;margin:0;">
      <strong style="color:#475569;">Strata</strong> — Staff performance intelligence<br>
      <a href="${appUrl}/dashboard/settings" style="color:#475569;text-decoration:none;">Manage referrals</a>
    </p>
  </div>
</body>
</html>`;
}
