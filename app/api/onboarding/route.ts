import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { resend, FROM } from "@/lib/resend";
import { z } from "zod";

const OnboardingSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["restaurant", "cafe", "salon", "gym", "retail", "other"]),
  locationCount: z.number().int().min(1),
  staffCount: z.number().int().min(1),
  laborCostTarget: z.number().min(0.05).max(1),
  staffRoles: z.array(z.object({ role: z.string(), hourlyRate: z.number() })),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, type, locationCount, staffCount, laborCostTarget, staffRoles } = parsed.data;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const stripeCustomer = await stripe.customers.create({
    name,
    metadata: { clerkUserId: userId },
  });

  const org = await prisma.organization.upsert({
    where: { clerkUserId: userId },
    create: {
      clerkUserId: userId,
      name,
      type,
      locationCount,
      staffCount,
      laborCostTarget,
      plan: "trial",
      stripeCustomerId: stripeCustomer.id,
      trialEndsAt,
      onboardingDone: false,
    },
    update: {
      name,
      type,
      locationCount,
      staffCount,
      laborCostTarget,
      stripeCustomerId: stripeCustomer.id,
      trialEndsAt,
    },
  });

  // Create placeholder staff members for each role
  for (const { role, hourlyRate } of staffRoles) {
    await prisma.staffMember.create({
      data: { orgId: org.id, displayName: role, role, hourlyRate },
    });
  }

  return NextResponse.json({ orgId: org.id });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.action === "update_labor") {
    const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    // Update org labor target
    await prisma.organization.update({
      where: { clerkUserId: userId },
      data: { laborCostTarget: body.laborCostTarget ?? org.laborCostTarget },
    });

    // Update or create staff roles
    if (Array.isArray(body.staffRoles)) {
      for (const { role, hourlyRate } of body.staffRoles) {
        const existing = await prisma.staffMember.findFirst({ where: { orgId: org.id, role } });
        if (existing) {
          await prisma.staffMember.update({ where: { id: existing.id }, data: { hourlyRate } });
        } else {
          await prisma.staffMember.create({ data: { orgId: org.id, displayName: role, role, hourlyRate } });
        }
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (body.action === "complete") {
    const org = await prisma.organization.update({
      where: { clerkUserId: userId },
      data: { onboardingDone: true },
    });

    // Send onboarding complete email
    try {
      const { createClerkClient } = await import("@clerk/nextjs/server");
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const user = await clerk.users.getUser(userId);
      const email = user.emailAddresses[0]?.emailAddress;
      if (email) {
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: "Your first Strata analysis is running",
          html: buildOnboardingEmail(org.name),
        });
      }
    } catch (e) {
      console.error(e);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

function buildOnboardingEmail(orgName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";
  return `
<!DOCTYPE html>
<html>
<body style="background:#0f172a;font-family:Inter,sans-serif;padding:40px 20px;margin:0;">
  <div style="max-width:540px;margin:0 auto;">
    <span style="color:#3B82F6;font-size:20px;font-weight:700;">Strata</span>
    <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin-top:24px;">Your first analysis is running.</h1>
    <p style="color:#94a3b8;font-size:15px;line-height:1.7;">We're crunching through your last 90 days of data for <strong style="color:#f1f5f9;">${orgName}</strong>. Your first performance digest will be ready within a few hours — we'll email you when it's done.</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;">In the meantime, your dashboard is live. You can view staff profiles, add more team members, and set your shift targets.</p>
    <a href="${appUrl}/dashboard" style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;margin-top:8px;">Go to dashboard →</a>
  </div>
</body>
</html>`;
}
