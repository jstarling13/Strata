import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend, FROM } from "@/lib/resend";

// Runs daily — sends personalized trial day-12 email to orgs expiring in 2 days
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const in2Days = new Date();
  in2Days.setDate(in2Days.getDate() + 2);
  const windowStart = new Date(in2Days);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(in2Days);
  windowEnd.setHours(23, 59, 59, 999);

  const expiringOrgs = await prisma.organization.findMany({
    where: {
      plan: "trial",
      status: "active",
      trialEndsAt: { gte: windowStart, lte: windowEnd },
    },
  });

  let sent = 0;

  for (const org of expiringOrgs) {
    // Get their single best insight to personalize the email
    const digest = await prisma.weeklyDigest.findFirst({
      where: { orgId: org.id },
      orderBy: { weekOf: "desc" },
    });

    const topInsight = digest
      ? (digest.insightsJson as any[])?.[0]
      : null;

    const topStaff = await prisma.staffWeeklyStats.findFirst({
      where: { orgId: org.id },
      orderBy: { repeatRate: "desc" },
      include: { staff: true },
    });

    try {
      const { createClerkClient } = await import("@clerk/nextjs/server");
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const user = await clerk.users.getUser(org.clerkUserId);
      const email = user.emailAddresses[0]?.emailAddress;
      if (!email) continue;

      await resend.emails.send({
        from: FROM,
        to: email,
        subject: `Your Strata trial ends in 2 days — here's what your data shows`,
        html: buildTrialNudgeEmail(org.name, topInsight, topStaff),
      });
      sent++;
    } catch (e) {
      console.error(`Failed to send trial nudge for org ${org.id}:`, e);
    }
  }

  return NextResponse.json({ sent, total: expiringOrgs.length });
}

function buildTrialNudgeEmail(
  orgName: string,
  topInsight: { title: string; body: string; action?: string } | null,
  topStaff: { staff: { displayName: string }; repeatRate: number } | null
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";

  const insightHtml = topInsight
    ? `
    <div style="background:#1e293b;border-left:3px solid #3B82F6;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
      <div style="color:#3B82F6;font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:6px;">From your data</div>
      <div style="color:#f1f5f9;font-size:15px;font-weight:600;margin-bottom:8px;">${topInsight.title}</div>
      <div style="color:#94a3b8;font-size:14px;line-height:1.6;">${topInsight.body}</div>
      ${topInsight.action ? `<div style="color:#93c5fd;font-size:13px;margin-top:10px;font-style:italic;">→ ${topInsight.action}</div>` : ""}
    </div>`
    : topStaff
    ? `
    <div style="background:#1e293b;border-left:3px solid #3B82F6;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
      <div style="color:#3B82F6;font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:6px;">From your data</div>
      <div style="color:#f1f5f9;font-size:15px;line-height:1.6;">
        <strong>${topStaff.staff.displayName}</strong> has a ${Math.round(topStaff.repeatRate * 100)}% repeat customer rate.
        Strata has identified which shifts are most profitable for ${orgName} and where your labor dollar is working hardest.
      </div>
    </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<body style="background:#0f172a;font-family:Inter,sans-serif;padding:40px 20px;margin:0;">
  <div style="max-width:580px;margin:0 auto;">
    <span style="color:#3B82F6;font-size:20px;font-weight:700;">Strata</span>

    <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin-top:24px;line-height:1.3;">
      Your trial ends in 2 days.<br/>Here's what your data found.
    </h1>

    <p style="color:#94a3b8;font-size:14px;line-height:1.7;">
      You've had Strata connected to <strong style="color:#f1f5f9;">${orgName}</strong> for 12 days.
      Here's one thing your data is telling you — that you probably didn't know before.
    </p>

    ${insightHtml}

    <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin-top:24px;">
      This is one of ${topInsight ? "several" : "the"} insights Strata has found in your data.
      Add a payment method to keep weekly performance reports, your full shift profitability heatmap, and anomaly alerts.
    </p>

    <div style="margin-top:28px;">
      <a href="${appUrl}/dashboard/billing"
         style="background:#3B82F6;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        Keep my Strata account →
      </a>
    </div>

    <p style="color:#475569;font-size:12px;margin-top:32px;line-height:1.6;">
      Standard is $129/month — less than one unprofitable shift. Annual plans available at $999/year (save 35%).<br/>
      <a href="${appUrl}/dashboard" style="color:#475569;">View dashboard</a> ·
      <a href="${appUrl}/dashboard/billing" style="color:#475569;">Manage billing</a>
    </p>
  </div>
</body>
</html>`;
}
