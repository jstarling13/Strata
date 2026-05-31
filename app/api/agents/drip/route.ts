import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend, FROM } from "@/lib/resend";

// Runs daily — sends Day 3 and Day 7 drip emails to trial orgs
// Day 3: First action — show top vs bottom staff gap, give a concrete next step
// Day 7: One-week check-in — real numbers, annual opportunity, top insight
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";
  const now = new Date();

  function dayWindow(daysAgo: number) {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  const [day3Orgs, day7Orgs] = await Promise.all([
    prisma.organization.findMany({
      where: { plan: "trial", status: "active", createdAt: dayWindow(3) },
    }),
    prisma.organization.findMany({
      where: { plan: "trial", status: "active", createdAt: dayWindow(7) },
    }),
  ]);

  let sent = 0;
  const errors: string[] = [];

  // ── Day 3: first-action email ──────────────────────────────────────────────
  for (const org of day3Orgs) {
    try {
      const staffStats = await prisma.staffWeeklyStats.findMany({
        where: { orgId: org.id },
        include: { staff: true },
        orderBy: { repeatRate: "desc" },
        take: 10,
      });

      // Skip if no data yet — they haven't connected a source
      if (staffStats.length === 0) continue;

      const email = await getUserEmail(org.clerkUserId);
      if (!email) continue;

      const topStaff = staffStats[0];
      const bottomStaff = staffStats[staffStats.length - 1];
      const gap = topStaff.repeatRate - (bottomStaff.staffId !== topStaff.staffId ? bottomStaff.repeatRate : 0);
      const weeklyRevenue = staffStats.reduce((s, m) => s + m.revenue, 0);

      await resend.emails.send({
        from: FROM,
        to: email,
        subject: `Day 3 — one action that moves the needle for ${org.name}`,
        html: buildDay3Email({
          orgName: org.name,
          topStaff: { name: topStaff.staff.displayName, repeatRate: topStaff.repeatRate, revenue: topStaff.revenue },
          bottomStaff: bottomStaff.staffId !== topStaff.staffId
            ? { name: bottomStaff.staff.displayName, repeatRate: bottomStaff.repeatRate }
            : null,
          staffCount: staffStats.length,
          weeklyRevenue,
          gap,
          appUrl,
        }),
      });
      sent++;
    } catch (e: any) {
      errors.push(`day3/${org.id}: ${e.message}`);
    }
  }

  // ── Day 7: one-week check-in email ────────────────────────────────────────
  for (const org of day7Orgs) {
    try {
      const [staffStats, latestDigest, shiftPerf] = await Promise.all([
        prisma.staffWeeklyStats.findMany({
          where: { orgId: org.id },
          include: { staff: true },
          orderBy: { repeatRate: "desc" },
          distinct: ["staffId"],
        }),
        prisma.weeklyDigest.findFirst({
          where: { orgId: org.id },
          orderBy: { weekOf: "desc" },
        }),
        prisma.shiftPerformance.findMany({
          where: { orgId: org.id },
          orderBy: { laborPct: "asc" },
        }),
      ]);

      if (staffStats.length === 0) continue;

      const email = await getUserEmail(org.clerkUserId);
      if (!email) continue;

      const topStaff = staffStats[0];
      const bottomStaff = staffStats[staffStats.length - 1];
      const weeklyRevenue = staffStats.reduce((s, m) => s + m.revenue, 0);
      const teamAvgRepeatRate = staffStats.reduce((s, m) => s + m.repeatRate, 0) / staffStats.length;
      const topInsight = latestDigest ? (latestDigest.insightsJson as any[])?.[0] : null;
      const bestShift = shiftPerf[0] ?? null;

      // Annual opportunity
      const topRate = topStaff.repeatRate;
      const sortedRates = [...staffStats].sort((a, b) => a.repeatRate - b.repeatRate);
      const medianRate = sortedRates.length > 0 ? sortedRates[Math.floor(sortedRates.length / 2)].repeatRate : 0;
      const annualOpportunity = staffStats.length >= 2
        ? Math.round(
            sortedRates
              .filter((s) => s.repeatRate < medianRate)
              .reduce((sum, s) => {
                const gap = Math.max(0, topRate - s.repeatRate);
                return sum + s.revenue * gap * 0.25;
              }, 0) * 52
          )
        : 0;

      await resend.emails.send({
        from: FROM,
        to: email,
        subject: `One week in — here's how ${org.name} is really performing`,
        html: buildDay7Email({
          orgName: org.name,
          topStaff: { name: topStaff.staff.displayName, repeatRate: topStaff.repeatRate, revenue: topStaff.revenue },
          bottomStaff: bottomStaff.staffId !== topStaff.staffId
            ? { name: bottomStaff.staff.displayName, repeatRate: bottomStaff.repeatRate }
            : null,
          staffCount: staffStats.length,
          weeklyRevenue,
          teamAvgRepeatRate,
          annualOpportunity,
          topInsight,
          bestShift: bestShift ? { laborPct: bestShift.laborPct } : null,
          daysLeft: org.trialEndsAt
            ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / 86400000))
            : 7,
          appUrl,
        }),
      });
      sent++;
    } catch (e: any) {
      errors.push(`day7/${org.id}: ${e.message}`);
    }
  }

  return NextResponse.json({
    sent,
    day3: day3Orgs.length,
    day7: day7Orgs.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ── Email builders ────────────────────────────────────────────────────────────

interface Day3Params {
  orgName: string;
  topStaff: { name: string; repeatRate: number; revenue: number };
  bottomStaff: { name: string; repeatRate: number } | null;
  staffCount: number;
  weeklyRevenue: number;
  gap: number;
  appUrl: string;
}

function buildDay3Email(p: Day3Params): string {
  const fmtPct = (n: number) => Math.round(n * 100) + "%";
  const fmtK = (n: number) => n >= 10000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n).toLocaleString()}`;

  const gapHtml = p.bottomStaff && p.gap > 0.05 ? `
    <div style="background:linear-gradient(135deg,#172554,#1e293b);border:1px solid #3b82f644;border-radius:14px;padding:20px 24px;margin-bottom:20px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px;">The gap in your team</div>
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px;">
        <div style="flex:1;">
          <div style="color:#4ade80;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Top — ${p.topStaff.name}</div>
          <div style="color:#f1f5f9;font-size:22px;font-weight:800;">${fmtPct(p.topStaff.repeatRate)}</div>
          <div style="color:#86efac;font-size:12px;">repeat rate</div>
        </div>
        <div style="color:#475569;font-size:24px;font-weight:300;">→</div>
        <div style="flex:1;text-align:right;">
          <div style="color:#f87171;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Bottom — ${p.bottomStaff.name}</div>
          <div style="color:#f1f5f9;font-size:22px;font-weight:800;">${fmtPct(p.bottomStaff.repeatRate)}</div>
          <div style="color:#fca5a5;font-size:12px;">repeat rate</div>
        </div>
      </div>
      <div style="background:#0f172a;border-radius:8px;padding:10px 14px;">
        <span style="color:#475569;font-size:12px;">Gap: </span>
        <span style="color:#fb923c;font-size:14px;font-weight:700;">${fmtPct(p.gap)}</span>
        <span style="color:#475569;font-size:12px;"> — that's the lever you have today</span>
      </div>
    </div>` : `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px 24px;margin-bottom:20px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Your top performer</div>
      <div style="color:#f1f5f9;font-size:18px;font-weight:700;">${p.topStaff.name}</div>
      <div style="color:#86efac;font-size:14px;margin-top:4px;">${fmtPct(p.topStaff.repeatRate)} repeat rate · ${fmtK(p.topStaff.revenue)} this week</div>
    </div>`;

  const actionHtml = `
    <div style="background:#0f2a1a;border:1px solid #16a34a55;border-radius:14px;padding:20px 24px;margin-bottom:20px;">
      <div style="color:#4ade80;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Your action for this week</div>
      <div style="color:#f1f5f9;font-size:16px;font-weight:700;margin-bottom:10px;line-height:1.4;">
        Have ${p.topStaff.name} shadow your lower-performing staff for one shift
      </div>
      <div style="color:#86efac;font-size:14px;line-height:1.7;">
        Your best server converts <strong>${fmtPct(p.topStaff.repeatRate)}</strong> of customers into repeat visitors.
        That's not luck — it's a learnable behavior. One shift of peer observation is the fastest way to close the gap.
      </div>
      ${p.bottomStaff ? `
      <div style="margin-top:14px;background:#0a1f12;border-radius:8px;padding:12px 14px;">
        <span style="color:#86efac;font-size:11px;font-weight:700;text-transform:uppercase;">Who to pair: </span>
        <span style="color:#d1fae5;font-size:13px;">${p.topStaff.name} + ${p.bottomStaff.name} — ${fmtPct(p.gap)} gap to close</span>
      </div>` : ""}
    </div>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;margin:0;padding:0;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid #1e293b;">
    <span style="color:#3B82F6;font-size:20px;font-weight:800;">Strata</span>
    <span style="background:#0c1a3322;color:#60a5fa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:3px 10px;border-radius:20px;border:1px solid #3b82f644;">Day 3</span>
  </div>

  <h1 style="color:#f1f5f9;font-size:24px;font-weight:800;margin:0 0 10px;line-height:1.3;">
    ${p.orgName} is live. Here's the one thing to do today.
  </h1>
  <p style="color:#64748b;font-size:14px;margin:0 0 28px;line-height:1.6;">
    We've been tracking your team for 3 days. Your data is real — here's what it's telling you.
  </p>

  ${gapHtml}
  ${actionHtml}

  <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:flex;gap:24px;">
    <div>
      <div style="color:#93c5fd;font-size:20px;font-weight:800;">${p.staffCount}</div>
      <div style="color:#64748b;font-size:12px;margin-top:2px;">Staff ranked</div>
    </div>
    <div>
      <div style="color:#93c5fd;font-size:20px;font-weight:800;">${fmtK(p.weeklyRevenue)}</div>
      <div style="color:#64748b;font-size:12px;margin-top:2px;">Revenue analyzed</div>
    </div>
    <div>
      <div style="color:#4ade80;font-size:20px;font-weight:800;">${fmtPct(p.topStaff.repeatRate)}</div>
      <div style="color:#64748b;font-size:12px;margin-top:2px;">Best repeat rate</div>
    </div>
  </div>

  <div style="margin:28px 0;text-align:center;padding:24px;background:linear-gradient(135deg,#1e3a5f,#1e293b);border-radius:16px;border:1px solid #2563eb44;">
    <div style="color:#f8fafc;font-size:16px;font-weight:700;margin-bottom:8px;">See the full leaderboard</div>
    <p style="color:#94a3b8;font-size:13px;margin:0 0 16px;line-height:1.5;">
      Every staff member ranked by repeat rate — with revenue impact per person.
    </p>
    <a href="${p.appUrl}/dashboard/staff" style="background:#3B82F6;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
      View staff rankings →
    </a>
  </div>

  <p style="color:#475569;font-size:12px;border-top:1px solid #1e293b;padding-top:20px;margin:0;line-height:1.8;">
    <strong style="color:#475569;">Strata</strong> — Staff performance intelligence<br>
    <a href="${p.appUrl}/dashboard/settings" style="color:#475569;text-decoration:none;">Manage preferences</a>
    &nbsp;·&nbsp;
    <a href="${p.appUrl}/dashboard/billing" style="color:#475569;text-decoration:none;">View plan</a>
  </p>
</div>
</body>
</html>`;
}

interface Day7Params {
  orgName: string;
  topStaff: { name: string; repeatRate: number; revenue: number };
  bottomStaff: { name: string; repeatRate: number } | null;
  staffCount: number;
  weeklyRevenue: number;
  teamAvgRepeatRate: number;
  annualOpportunity: number;
  topInsight: { title: string; body: string; action?: string } | null;
  bestShift: { laborPct: number } | null;
  daysLeft: number;
  appUrl: string;
}

function buildDay7Email(p: Day7Params): string {
  const fmtPct = (n: number) => Math.round(n * 100) + "%";
  const fmtK = (n: number) => n >= 10000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n).toLocaleString()}`;

  const opportunityHtml = p.annualOpportunity >= 500 ? `
    <div style="background:linear-gradient(135deg,#172554,#1e293b);border:1px solid #3b82f644;border-radius:14px;padding:20px 24px;margin-bottom:20px;text-align:center;">
      <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Annual opportunity in your data</div>
      <div style="color:#93c5fd;font-size:36px;font-weight:800;line-height:1;margin-bottom:6px;">${fmtK(p.annualOpportunity)}/yr</div>
      <div style="color:#64748b;font-size:13px;">Close the repeat-rate gap between your top and bottom staff</div>
    </div>` : "";

  const staffHtml = `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px 24px;margin-bottom:16px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">Your team after 7 days</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div style="color:#4ade80;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:2px;">🥇 ${p.topStaff.name}</div>
          <div style="color:#f1f5f9;font-size:18px;font-weight:800;">${fmtPct(p.topStaff.repeatRate)}</div>
          <div style="color:#86efac;font-size:12px;">${fmtK(p.topStaff.revenue)} · repeat rate</div>
        </div>
        ${p.bottomStaff ? `
        <div style="text-align:right;">
          <div style="color:#f87171;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:2px;">Needs coaching — ${p.bottomStaff.name}</div>
          <div style="color:#f1f5f9;font-size:18px;font-weight:800;">${fmtPct(p.bottomStaff.repeatRate)}</div>
          <div style="color:#fca5a5;font-size:12px;">repeat rate</div>
        </div>` : ""}
      </div>
      <div style="background:#0f172a;border-radius:8px;padding:10px 14px;margin-top:6px;">
        <span style="color:#475569;font-size:12px;">Team average: </span>
        <span style="color:#93c5fd;font-size:13px;font-weight:700;">${fmtPct(p.teamAvgRepeatRate)}</span>
        <span style="color:#475569;font-size:12px;"> across ${p.staffCount} staff members</span>
      </div>
    </div>`;

  const insightHtml = p.topInsight ? `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px 24px;margin-bottom:16px;border-left:4px solid #3b82f6;">
      <div style="color:#60a5fa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Your AI insight this week</div>
      <div style="color:#f1f5f9;font-size:15px;font-weight:700;margin-bottom:8px;line-height:1.4;">${p.topInsight.title}</div>
      <div style="color:#94a3b8;font-size:13px;line-height:1.7;">${p.topInsight.body}</div>
      ${p.topInsight.action ? `
      <div style="margin-top:12px;background:#172554;border:1px solid #1e40af44;border-radius:8px;padding:10px 14px;">
        <span style="color:#93c5fd;font-size:11px;font-weight:700;text-transform:uppercase;">Action: </span>
        <span style="color:#bfdbfe;font-size:13px;">${p.topInsight.action}</span>
      </div>` : ""}
    </div>` : "";

  const metricsHtml = `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;gap:24px;flex-wrap:wrap;">
      <div>
        <div style="color:#93c5fd;font-size:20px;font-weight:800;">${fmtK(p.weeklyRevenue)}</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">Weekly revenue tracked</div>
      </div>
      <div>
        <div style="color:#94a3b8;font-size:20px;font-weight:800;">${p.staffCount}</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">Staff ranked</div>
      </div>
      ${p.bestShift ? `
      <div>
        <div style="color:#4ade80;font-size:20px;font-weight:800;">${fmtPct(p.bestShift.laborPct)}</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">Best shift labor cost</div>
      </div>` : ""}
    </div>`;

  const urgencyHtml = p.daysLeft <= 7 ? `
    <div style="background:#1a0f0a;border:1px solid #f59e0b44;border-radius:12px;padding:14px 18px;margin-bottom:20px;">
      <div style="color:#fbbf24;font-size:12px;font-weight:700;margin-bottom:4px;">⏱ ${p.daysLeft} days left in your trial</div>
      <div style="color:#fde68a;font-size:13px;line-height:1.6;">
        Your insights and staff rankings stay accessible even after the trial ends —
        but new data stops processing. Upgrade now to keep the momentum going.
      </div>
    </div>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;margin:0;padding:0;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid #1e293b;">
    <span style="color:#3B82F6;font-size:20px;font-weight:800;">Strata</span>
    <span style="background:#0c1a3322;color:#a78bfa;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:3px 10px;border-radius:20px;border:1px solid #7c3aed44;">Day 7</span>
  </div>

  <h1 style="color:#f1f5f9;font-size:24px;font-weight:800;margin:0 0 10px;line-height:1.3;">
    One week in — here's how ${p.orgName} is really performing.
  </h1>
  <p style="color:#64748b;font-size:14px;margin:0 0 28px;line-height:1.6;">
    Seven days of real transaction data analyzed. Here's your snapshot — and what to do with it.
  </p>

  ${opportunityHtml}
  ${metricsHtml}
  ${staffHtml}
  ${insightHtml}
  ${urgencyHtml}

  <div style="margin:28px 0;text-align:center;padding:28px;background:linear-gradient(135deg,#1e3a5f,#1e293b);border-radius:16px;border:1px solid #2563eb44;">
    <div style="color:#f8fafc;font-size:17px;font-weight:700;margin-bottom:8px;">See your full 7-day analysis</div>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;line-height:1.5;">
      Shift heatmap, staff leaderboard, repeat rate trends — all in your dashboard.
    </p>
    <a href="${p.appUrl}/dashboard" style="background:#3B82F6;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
      Open dashboard →
    </a>
    ${p.daysLeft <= 7 ? `
    <div style="margin-top:14px;">
      <a href="${p.appUrl}/dashboard/billing" style="color:#60a5fa;font-size:13px;text-decoration:none;font-weight:600;">
        Or upgrade now to keep insights flowing →
      </a>
    </div>` : ""}
  </div>

  <p style="color:#475569;font-size:12px;border-top:1px solid #1e293b;padding-top:20px;margin:0;line-height:1.8;">
    <strong style="color:#475569;">Strata</strong> — Staff performance intelligence<br>
    <a href="${p.appUrl}/dashboard/settings" style="color:#475569;text-decoration:none;">Manage preferences</a>
    &nbsp;·&nbsp;
    <a href="${p.appUrl}/dashboard/billing" style="color:#475569;text-decoration:none;">View plan</a>
  </p>
</div>
</body>
</html>`;
}

async function getUserEmail(clerkUserId: string): Promise<string | null> {
  try {
    const { createClerkClient } = await import("@clerk/nextjs/server");
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const user = await clerk.users.getUser(clerkUserId);
    return user.emailAddresses[0]?.emailAddress || null;
  } catch {
    return null;
  }
}
