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

    // Get total revenue surveyed and insight count
    const allDigests = await prisma.weeklyDigest.findMany({ where: { orgId: org.id } });
    const allStaffStats = await prisma.staffWeeklyStats.findMany({ where: { orgId: org.id } });
    const totalRevenueSurveyed = allStaffStats.reduce((s: number, m: any) => s + (m.revenue ?? 0), 0);
    const insightCount = allDigests.reduce((s, d) => s + ((d.insightsJson as any[])?.length ?? 0), 0);

    // Compute annual revenue opportunity (latest week data)
    const latestWeekStats = await prisma.staffWeeklyStats.findMany({
      where: { orgId: org.id },
      orderBy: { weekOf: "desc" },
      distinct: ["staffId"],
    });
    const topRate = latestWeekStats.length > 0 ? Math.max(...latestWeekStats.map((s: any) => s.repeatRate)) : 0;
    const sortedRates = [...latestWeekStats].sort((a: any, b: any) => a.repeatRate - b.repeatRate);
    const medianRate = sortedRates.length > 0 ? sortedRates[Math.floor(sortedRates.length / 2)] as any : null;
    const annualOpportunity = latestWeekStats.length >= 2 && topRate > 0
      ? Math.round(
          latestWeekStats
            .filter((s: any) => s.repeatRate < (medianRate?.repeatRate ?? topRate))
            .reduce((sum: number, s: any) => {
              const gap = Math.max(0, topRate - s.repeatRate);
              return sum + s.revenue * gap * 0.25;
            }, 0) * 52
        )
      : 0;

    try {
      const { createClerkClient } = await import("@clerk/nextjs/server");
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const user = await clerk.users.getUser(org.clerkUserId);
      const email = user.emailAddresses[0]?.emailAddress;
      if (!email) continue;

      const topStaffWithRevenue = topStaff ? {
        staff: topStaff.staff,
        repeatRate: (topStaff as any).repeatRate,
        revenue: (topStaff as any).revenue ?? 0,
      } : null;

      const subject = annualOpportunity >= 1000
        ? `${org.name}: $${Math.round(annualOpportunity / 1000)}k/yr identified — your trial ends in 2 days`
        : `Your Strata trial ends in 2 days — ${insightCount} insights ready`;

      await resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html: buildTrialNudgeEmail(org.name, topInsight, topStaffWithRevenue, totalRevenueSurveyed, insightCount, annualOpportunity),
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
  topStaff: { staff: { displayName: string }; repeatRate: number; revenue: number } | null,
  totalRevenueSurveyed?: number,
  insightCount?: number,
  annualOpportunity?: number
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";
  const fmtCurrency = (n: number) => "$" + Math.round(n).toLocaleString();
  const fmtK = (n: number) => n >= 10000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n).toLocaleString()}`;

  // Key insight card
  const insightHtml = topInsight ? `
    <div style="background:#1e293b;border-radius:14px;padding:20px 24px;margin:24px 0;border:1px solid #334155;border-left:4px solid #3b82f6;">
      <div style="color:#60a5fa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Your top insight this trial</div>
      <div style="color:#f1f5f9;font-size:16px;font-weight:700;margin-bottom:10px;line-height:1.4;">${topInsight.title}</div>
      <div style="color:#94a3b8;font-size:14px;line-height:1.7;">${topInsight.body}</div>
      ${topInsight.action ? `
      <div style="margin-top:14px;background:#172554;border:1px solid #1e40af44;border-radius:8px;padding:12px 14px;">
        <span style="color:#93c5fd;font-size:11px;font-weight:700;text-transform:uppercase;">Action: </span>
        <span style="color:#bfdbfe;font-size:13px;">${topInsight.action}</span>
      </div>` : ""}
    </div>` : "";

  // Top staff callout
  const staffHtml = topStaff ? `
    <div style="background:#0f2a1a;border:1px solid #16a34a44;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <div style="color:#4ade80;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Best performer this trial</div>
      <div style="color:#f1f5f9;font-size:15px;font-weight:700;">${topStaff.staff.displayName}</div>
      <div style="color:#86efac;font-size:14px;margin-top:4px;">
        ${Math.round(topStaff.repeatRate * 100)}% repeat rate · ${fmtCurrency(topStaff.revenue)} in revenue this period
      </div>
    </div>` : "";

  // Stats summary
  const statsHtml = (totalRevenueSurveyed ?? 0) > 0 || (insightCount ?? 0) > 0 ? `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px 24px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#475569;margin-bottom:12px;">What Strata analyzed in your 14-day trial</div>
      <div style="display:flex;gap:32px;">
        ${totalRevenueSurveyed ? `
        <div>
          <div style="color:#93c5fd;font-size:20px;font-weight:800;">${fmtCurrency(totalRevenueSurveyed)}</div>
          <div style="color:#64748b;font-size:12px;margin-top:2px;">Revenue analyzed</div>
        </div>` : ""}
        ${insightCount ? `
        <div>
          <div style="color:#93c5fd;font-size:20px;font-weight:800;">${insightCount}</div>
          <div style="color:#64748b;font-size:12px;margin-top:2px;">Insights generated</div>
        </div>` : ""}
      </div>
    </div>` : "";

  // Annual opportunity callout
  const opportunityHtml = (annualOpportunity ?? 0) >= 500 ? `
    <div style="background:linear-gradient(135deg,#172554,#1e293b);border:1px solid #3b82f644;border-radius:14px;padding:20px 24px;margin-bottom:20px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Identified in your data — closing in 2 days</div>
      <div style="color:#93c5fd;font-size:32px;font-weight:800;line-height:1.1;margin-bottom:6px;">${fmtK(annualOpportunity ?? 0)}/yr</div>
      <div style="color:#64748b;font-size:13px;line-height:1.5;">This is how much you'd recover annually by closing the repeat-rate gap between your top and bottom staff. It stays buried without Strata.</div>
    </div>` : "";

  // What you'll lose
  const loseHtml = `
    <div style="background:#1a1010;border:1px solid #44222244;border-radius:12px;padding:16px 20px;margin:20px 0;">
      <div style="color:#f87171;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">After your trial expires:</div>
      <ul style="color:#fca5a5;font-size:14px;margin:0;padding-left:18px;line-height:2;">
        <li>Weekly AI performance digest stops</li>
        <li>Shift profitability heatmap locked</li>
        <li>Staff repeat rate tracking paused</li>
        <li>All your insights archived (not deleted — resume anytime)</li>
      </ul>
    </div>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;margin:0;padding:0;">
  <div style="max-width:580px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid #1e293b;">
      <span style="color:#3B82F6;font-size:20px;font-weight:800;">Strata</span>
      <span style="color:#f59e0b;font-size:12px;font-weight:700;background:#451a0322;border:1px solid #f59e0b44;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.06em;">Trial ending</span>
    </div>

    <!-- Title -->
    <h1 style="color:#f8fafc;font-size:24px;font-weight:800;margin:0 0 10px;line-height:1.3;">
      2 days left — here's what we found in <strong>${orgName}</strong>
    </h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.6;">
      Your trial has surfaced some real data. Here's what continues — and what stops — on day 14.
    </p>

    <!-- Annual opportunity -->
    ${opportunityHtml}

    <!-- Stats summary -->
    ${statsHtml}

    <!-- Top staff -->
    ${staffHtml}

    <!-- Top insight -->
    ${insightHtml}

    <!-- What you'll lose -->
    ${loseHtml}

    <!-- CTA -->
    <div style="margin-top:28px;text-align:center;padding:28px;background:linear-gradient(135deg,#1e3a5f 0%,#1e293b 100%);border-radius:16px;border:1px solid #2563eb44;">
      <div style="color:#f8fafc;font-size:18px;font-weight:700;margin-bottom:8px;">Keep your insights flowing</div>
      <div style="color:#94a3b8;font-size:14px;margin-bottom:20px;">Standard: $129/month — less than one unprofitable shift</div>
      <a href="${appUrl}/dashboard/billing" style="background:#3B82F6;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        Upgrade now →
      </a>
      <div style="color:#475569;font-size:12px;margin-top:12px;">or $83/month billed annually (save 35%)</div>
    </div>

    <!-- Footer -->
    <div style="margin-top:24px;text-align:center;">
      <p style="color:#334155;font-size:12px;line-height:1.8;">
        Strata · <a href="${appUrl}/dashboard" style="color:#475569;text-decoration:none;">Dashboard</a> ·
        <a href="${appUrl}/dashboard/billing" style="color:#475569;text-decoration:none;">Billing</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
