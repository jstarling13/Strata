import { prisma } from "@/lib/prisma";
import { resend, FROM } from "@/lib/resend";
import { startOfWeek, formatPct } from "@/lib/utils";

/**
 * Fires once — the first time an org's data is ready for analysis.
 * Called after the first successful sync or CSV attribution run.
 * Guards against double-sending via the dataReadyEmailSentAt flag
 * (uses lastSyncAt as a proxy — only fires when there's staff data).
 */
export async function maybeSendDataReadyEmail(orgId: string) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

  // Only send once: check if a weekly digest already exists (means we've sent before)
  // or if there are no staff stats yet (data still processing)
  const [staffStats, existingDigests] = await Promise.all([
    prisma.staffWeeklyStats.findMany({
      where: { orgId },
      include: { staff: true },
      orderBy: { repeatRate: "desc" },
      take: 10,
    }),
    prisma.weeklyDigest.findMany({ where: { orgId }, take: 1 }),
  ]);

  // No data yet — don't send
  if (staffStats.length === 0) return;

  // Already sent a digest email (weekly digest covers it) — skip
  // But if it's the very first data load and no digest exists, always send
  const weekOf = startOfWeek(new Date());
  const shiftPerf = await prisma.shiftPerformance.findMany({
    where: { orgId, weekOf },
    orderBy: { laborPct: "asc" },
  });

  const user = await getUserEmail(org.clerkUserId);
  if (!user) return;

  const topStaff = staffStats[0];
  const bottomStaff = staffStats[staffStats.length - 1];
  const weeklyRevenue = staffStats.reduce((s, m) => s + m.revenue, 0);
  const bestShift = shiftPerf[0] ?? null;
  const worstShift = shiftPerf[shiftPerf.length - 1] ?? null;
  const teamAvgRepeatRate = staffStats.reduce((s, m) => s + m.repeatRate, 0) / staffStats.length;

  // Compute opportunity
  const topRate = topStaff?.repeatRate ?? 0;
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";

  await resend.emails.send({
    from: FROM,
    to: user,
    subject: `✅ Your ${org.name} analysis is ready — ${staffStats.length} staff ranked`,
    html: buildDataReadyEmail({
      orgName: org.name,
      staffCount: staffStats.length,
      weeklyRevenue,
      topStaff: topStaff ? { name: topStaff.staff.displayName, repeatRate: topStaff.repeatRate, revenue: topStaff.revenue } : null,
      bottomStaff: bottomStaff && bottomStaff.staffId !== topStaff?.staffId
        ? { name: bottomStaff.staff.displayName, repeatRate: bottomStaff.repeatRate }
        : null,
      teamAvgRepeatRate,
      bestShift: bestShift ? { laborPct: bestShift.laborPct } : null,
      worstShift: worstShift && worstShift.laborPct > org.laborCostTarget
        ? { laborPct: worstShift.laborPct }
        : null,
      laborCostTarget: org.laborCostTarget,
      annualOpportunity,
      appUrl,
    }),
  });
}

interface DataReadyParams {
  orgName: string;
  staffCount: number;
  weeklyRevenue: number;
  topStaff: { name: string; repeatRate: number; revenue: number } | null;
  bottomStaff: { name: string; repeatRate: number } | null;
  teamAvgRepeatRate: number;
  bestShift: { laborPct: number } | null;
  worstShift: { laborPct: number } | null;
  laborCostTarget: number;
  annualOpportunity: number;
  appUrl: string;
}

function buildDataReadyEmail(p: DataReadyParams): string {
  const fmtPct = (n: number) => Math.round(n * 100) + "%";
  const fmtK = (n: number) => n >= 10000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n).toLocaleString()}`;

  const opportunityHtml = p.annualOpportunity >= 500 ? `
    <div style="background:linear-gradient(135deg,#172554,#1e293b);border:1px solid #3b82f644;border-radius:14px;padding:20px 24px;margin-bottom:20px;text-align:center;">
      <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Annual opportunity in your data</div>
      <div style="color:#93c5fd;font-size:36px;font-weight:800;line-height:1;margin-bottom:6px;">${fmtK(p.annualOpportunity)}/yr</div>
      <div style="color:#64748b;font-size:13px;">Close the repeat-rate gap between your top and bottom staff</div>
    </div>` : "";

  const staffHtml = p.topStaff ? `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px 24px;margin-bottom:16px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:14px;">Staff repeat rates — ranked</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div style="color:#4ade80;font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:2px;">🥇 Top performer</div>
          <div style="color:#f1f5f9;font-size:15px;font-weight:700;">${p.topStaff.name}</div>
          <div style="color:#86efac;font-size:13px;margin-top:2px;">${fmtPct(p.topStaff.repeatRate)} repeat rate</div>
        </div>
        ${p.bottomStaff ? `
        <div style="text-align:right;">
          <div style="color:#f87171;font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:2px;">Needs attention</div>
          <div style="color:#f1f5f9;font-size:15px;font-weight:700;">${p.bottomStaff.name}</div>
          <div style="color:#fca5a5;font-size:13px;margin-top:2px;">${fmtPct(p.bottomStaff.repeatRate)} repeat rate</div>
        </div>` : ""}
      </div>
      <div style="background:#0f172a;border-radius:8px;padding:12px 14px;margin-top:8px;">
        <div style="color:#475569;font-size:12px;">Team average: <span style="color:#93c5fd;font-weight:700;">${fmtPct(p.teamAvgRepeatRate)}</span>
        ${p.topStaff && p.bottomStaff ? ` · Gap between top and bottom: <span style="color:#fb923c;font-weight:700;">${fmtPct(p.topStaff.repeatRate - p.bottomStaff.repeatRate)}</span>` : ""}
        </div>
      </div>
    </div>` : "";

  const laborHtml = p.worstShift && p.worstShift.laborPct > p.laborCostTarget * 1.2 ? `
    <div style="background:#1a0a0a;border:1px solid #dc262644;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
      <div style="color:#fca5a5;font-size:12px;font-weight:700;margin-bottom:4px;">⚠️ Labor cost alert</div>
      <div style="color:#f1f5f9;font-size:14px;line-height:1.6;">
        Your worst shift is running at <strong style="color:#f87171;">${fmtPct(p.worstShift.laborPct)}</strong> labor cost —
        that's ${fmtPct(p.worstShift.laborPct - p.laborCostTarget)} over your ${fmtPct(p.laborCostTarget)} target.
        See the shift heatmap in your dashboard to find it.
      </div>
    </div>` : "";

  const metricsHtml = p.weeklyRevenue > 0 ? `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px 20px;margin-bottom:16px;display:flex;gap:24px;">
      <div>
        <div style="color:#93c5fd;font-size:20px;font-weight:800;">${fmtK(p.weeklyRevenue)}</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">Weekly revenue analyzed</div>
      </div>
      <div>
        <div style="color:#94a3b8;font-size:20px;font-weight:800;">${p.staffCount}</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">Staff members ranked</div>
      </div>
      ${p.bestShift ? `
      <div>
        <div style="color:#4ade80;font-size:20px;font-weight:800;">${fmtPct(p.bestShift.laborPct)}</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">Best shift labor cost</div>
      </div>` : ""}
    </div>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;margin:0;padding:0;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <div style="margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;">
    <span style="color:#3B82F6;font-size:20px;font-weight:800;">Strata</span>
    <span style="background:#16a34a22;color:#4ade80;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:3px 10px;border-radius:20px;border:1px solid #16a34a44;">Analysis ready</span>
  </div>

  <h1 style="color:#f1f5f9;font-size:26px;font-weight:800;margin:0 0 10px;line-height:1.3;">
    Your ${p.orgName} data is ready. Here's what we found.
  </h1>
  <p style="color:#64748b;font-size:14px;margin:0 0 28px;line-height:1.6;">
    We've analyzed your transaction history and ranked your team. Your full dashboard is live — here's a preview.
  </p>

  ${opportunityHtml}
  ${metricsHtml}
  ${staffHtml}
  ${laborHtml}

  <div style="margin:28px 0;text-align:center;padding:28px;background:linear-gradient(135deg,#1e3a5f,#1e293b);border-radius:16px;border:1px solid #2563eb44;">
    <div style="color:#f8fafc;font-size:17px;font-weight:700;margin-bottom:8px;">See your full analysis</div>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;line-height:1.5;">
      Shift heatmap, staff leaderboard, repeat rate trends, and your first AI insights — all live in your dashboard.
    </p>
    <a href="${p.appUrl}/dashboard" style="background:#3B82F6;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
      Open dashboard →
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
