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
  referredByOrgId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, type, locationCount, staffCount, laborCostTarget, staffRoles, referredByOrgId } = parsed.data;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  // Validate referral org exists (silently ignore invalid refs)
  let validReferral: string | null = null;
  if (referredByOrgId) {
    const referrer = await prisma.organization.findUnique({ where: { id: referredByOrgId } });
    if (referrer) validReferral = referredByOrgId;
  }

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
      ...(validReferral ? { referredByOrgId: validReferral } : {}),
    },
    update: {
      name,
      type,
      locationCount,
      staffCount,
      laborCostTarget,
      stripeCustomerId: stripeCustomer.id,
      trialEndsAt,
      // Don't overwrite an existing referral on re-submission
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
      const firstName = user.firstName;

      // Fetch data source info
      const dataSource = await prisma.dataSource.findFirst({ where: { orgId: org.id } });
      const staffCount = await prisma.staffMember.count({ where: { orgId: org.id } });

      if (email) {
        await resend.emails.send({
          from: FROM,
          to: email,
          subject: `Welcome to Strata, ${firstName || org.name} — your analysis is running`,
          html: buildOnboardingEmail({
            orgName: org.name,
            firstName: firstName ?? null,
            orgType: org.type,
            laborCostTarget: org.laborCostTarget,
            staffCount,
            dataSourceType: dataSource?.type ?? null,
            trialEndsAt: org.trialEndsAt,
          }),
        });
      }
    } catch (e) {
      console.error(e);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

interface OnboardingEmailParams {
  orgName: string;
  firstName: string | null;
  orgType: string;
  laborCostTarget: number;
  staffCount: number;
  dataSourceType: string | null;
  trialEndsAt: Date | null;
}

function buildOnboardingEmail({
  orgName,
  firstName,
  orgType,
  laborCostTarget,
  staffCount,
  dataSourceType,
  trialEndsAt,
}: OnboardingEmailParams) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";
  const greeting = firstName ? `Hi ${firstName},` : `Hi there,`;
  const laborPct = Math.round(laborCostTarget * 100);
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : 14;
  const sourceDisplay = dataSourceType
    ? dataSourceType.charAt(0).toUpperCase() + dataSourceType.slice(1)
    : "your POS";

  const INDUSTRY_BENCHMARKS: Record<string, { repeat: string; labor: string }> = {
    restaurant: { repeat: "38%", labor: "30%" },
    cafe: { repeat: "42%", labor: "32%" },
    salon: { repeat: "55%", labor: "35%" },
    gym: { repeat: "70%", labor: "28%" },
    retail: { repeat: "30%", labor: "25%" },
    other: { repeat: "35%", labor: "30%" },
  };
  const bench = INDUSTRY_BENCHMARKS[orgType] || INDUSTRY_BENCHMARKS.other;

  const WHAT_YOULL_DISCOVER = [
    { emoji: "📊", label: "Staff repeat rate ranking", desc: `Who's driving customer loyalty vs. who's letting them walk away — ranked across ${staffCount} staff member${staffCount !== 1 ? "s" : ""}` },
    { emoji: "🔥", label: "Shift profitability heatmap", desc: `Which days and time slots are running over your ${laborPct}% labor target — with the exact dollar overage per shift` },
    { emoji: "💡", label: "Weekly AI digest", desc: "Plain-English analysis of your top opportunity, delivered every week — no spreadsheets, no guessing" },
    { emoji: "💰", label: "Revenue gap estimates", desc: "How much you'd recover if your lowest-performing staff matched your best performer" },
  ];

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;padding:0;margin:0;color:#94a3b8;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <!-- Logo -->
  <div style="margin-bottom:32px;">
    <span style="color:#3B82F6;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Strata</span>
  </div>

  <!-- Headline -->
  <h1 style="color:#f1f5f9;font-size:26px;font-weight:700;margin:0 0 12px;line-height:1.3;">
    ${greeting} Your analysis is running.
  </h1>
  <p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#94a3b8;">
    We're crunching through 90 days of ${sourceDisplay} data for <strong style="color:#f1f5f9;">${orgName}</strong>.
    Your first performance digest will be ready within minutes (usually 2–4 min for live integrations, 30 sec for CSV).
    We'll email you the moment it's done.
  </p>

  <!-- CTA -->
  <div style="margin-bottom:32px;">
    <a href="${appUrl}/dashboard" style="background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
      Go to your dashboard →
    </a>
  </div>

  <!-- What you'll discover -->
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 16px;">What Strata is analyzing right now</p>
    ${WHAT_YOULL_DISCOVER.map(({ emoji, label, desc }) => `
    <div style="display:flex;gap:12px;margin-bottom:16px;align-items:flex-start;">
      <span style="font-size:20px;flex-shrink:0;">${emoji}</span>
      <div>
        <div style="color:#f1f5f9;font-size:13px;font-weight:600;margin-bottom:2px;">${label}</div>
        <div style="color:#64748b;font-size:12px;line-height:1.6;">${desc}</div>
      </div>
    </div>`).join("")}
  </div>

  <!-- Your benchmarks -->
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 16px;">Your setup vs. industry median</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr style="border-bottom:1px solid #334155;">
        <td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:500;">Labor cost target</td>
        <td style="padding:10px 0;color:#3b82f6;font-size:13px;font-weight:700;text-align:right;">${laborPct}%</td>
        <td style="padding:10px 0;color:#64748b;font-size:12px;text-align:right;padding-left:12px;">Industry: ${bench.labor}</td>
      </tr>
      <tr style="border-bottom:1px solid #334155;">
        <td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:500;">Target repeat rate</td>
        <td style="padding:10px 0;color:#3b82f6;font-size:13px;font-weight:700;text-align:right;">—</td>
        <td style="padding:10px 0;color:#64748b;font-size:12px;text-align:right;padding-left:12px;">Industry: ${bench.repeat}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#94a3b8;font-size:13px;font-weight:500;">Data source</td>
        <td style="padding:10px 0;color:#f1f5f9;font-size:13px;font-weight:600;text-align:right;" colspan="2">${sourceDisplay}</td>
      </tr>
    </table>
  </div>

  <!-- Trial reminder -->
  <div style="background:#172554;border:1px solid #1d4ed8;border-radius:12px;padding:16px 20px;margin-bottom:32px;">
    <div style="color:#93c5fd;font-size:13px;font-weight:600;margin-bottom:4px;">🗓 ${daysLeft} days left in your trial</div>
    <div style="color:#64748b;font-size:12px;line-height:1.6;">
      No charge until your trial ends. If you upgrade, your data and digests stay — nothing resets.
      <a href="${appUrl}/dashboard/billing" style="color:#3b82f6;">View plans →</a>
    </div>
  </div>

  <!-- Footer -->
  <p style="color:#475569;font-size:12px;line-height:1.8;border-top:1px solid #1e293b;padding-top:20px;margin:0;">
    This is a one-time notification from <strong>Strata</strong>. You signed up at strata.ai.<br>
    Questions? Reply to this email anytime — we read every one.<br>
    <a href="${appUrl}/dashboard/settings" style="color:#475569;">Manage preferences</a>
  </p>

</div>
</body>
</html>`;
}
