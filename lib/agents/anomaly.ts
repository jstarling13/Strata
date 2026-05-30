import { prisma } from "@/lib/prisma";
import { resend, FROM } from "@/lib/resend";
import { startOfWeek, formatPct } from "@/lib/utils";

export async function runAnomalyCheck(orgId: string) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (org.plan !== "plus") return;

  const weekOf = startOfWeek(new Date());
  const prevWeek = new Date(weekOf);
  prevWeek.setDate(prevWeek.getDate() - 7);

  const currentStats = await prisma.staffWeeklyStats.findMany({ where: { orgId, weekOf }, include: { staff: true } });
  const prevStats = await prisma.staffWeeklyStats.findMany({ where: { orgId, weekOf: prevWeek } });
  const prevMap = new Map(prevStats.map((s) => [s.staffId, s]));

  const alerts: AlertInfo[] = [];
  const { dayLabel, shiftSlotLabel } = await import("@/lib/utils");

  // Get weekly revenue total for dollar impact calc
  const shiftPerf = await prisma.shiftPerformance.findMany({ where: { orgId, weekOf } });
  const weeklyRevenue = shiftPerf.reduce((s: number, sh: any) => s + sh.totalSales, 0);

  for (const stat of currentStats) {
    const prev = prevMap.get(stat.staffId);
    if (!prev) continue;
    const drop = (prev as any).repeatRate - (stat as any).repeatRate;
    if (drop > 0.15) {
      // Estimate revenue impact: the staff member's transaction volume * avg ticket * repeat rate drop
      const txns = (stat as any).transactions ?? 0;
      const avgTicket = (stat as any).avgTicket ?? 35;
      const estimatedWeeklyImpact = Math.round(txns * avgTicket * drop * 0.3); // 30% of impacted txns won't return
      alerts.push({
        type: "repeat_rate_drop",
        staffName: (stat as any).staff.displayName,
        message: `${(stat as any).staff.displayName}'s repeat customer rate dropped from ${formatPct((prev as any).repeatRate)} to ${formatPct((stat as any).repeatRate)} this week — a ${formatPct(drop)} decline. At their transaction volume, this equates to approximately $${estimatedWeeklyImpact.toLocaleString()}/week in lost return visits if the trend continues.`,
        prevValue: (prev as any).repeatRate,
        currentValue: (stat as any).repeatRate,
        estimatedWeeklyImpact,
      });
    }
  }

  // Use per-org alert threshold (stored as integer pts, e.g. 20 = "fire when 20pp over target")
  const laborSpikeThreshold = org.laborCostTarget + (org.alertThreshold ?? 20) / 100;

  for (const shift of shiftPerf) {
    if ((shift as any).laborPct > laborSpikeThreshold) {
      const excessLaborCost = (shift as any).laborCost - ((shift as any).totalSales * org.laborCostTarget);
      alerts.push({
        type: "labor_cost_spike",
        message: `${dayLabel((shift as any).dayOfWeek)} ${shiftSlotLabel((shift as any).shiftSlot)} labor cost hit ${formatPct((shift as any).laborPct)} of sales — ${formatPct((shift as any).laborPct - org.laborCostTarget)} above your ${formatPct(org.laborCostTarget)} target. This single shift ran $${Math.round(excessLaborCost).toLocaleString()} over budget.`,
        prevValue: org.laborCostTarget,
        currentValue: (shift as any).laborPct,
        target: org.laborCostTarget,
        estimatedWeeklyImpact: Math.round(excessLaborCost),
      });
    }
  }

  if (alerts.length === 0) return;

  // Respect per-org alert email preference
  const shouldSendEmail = org.alertEmailEnabled !== false;
  const user = shouldSendEmail ? await getUserEmail(org.clerkUserId) : null;

  for (const alert of alerts) {
    const record = await prisma.anomalyAlert.create({
      data: { orgId, type: alert.type, message: alert.message },
    });

    if (user) {
      const subject = alert.type === "repeat_rate_drop"
        ? `⚠️ ${alert.staffName ?? "Staff"} repeat rate dropped ${formatPct(Math.abs((alert.currentValue ?? 0) - (alert.prevValue ?? 0)))} — Strata`
        : `⚠️ Labor cost spike detected — Strata alert`;

      await resend.emails.send({
        from: FROM,
        to: user,
        subject,
        html: buildAlertEmail(org.name, alert),
      });
      await prisma.anomalyAlert.update({ where: { id: record.id }, data: { sentAt: new Date() } });
    }
  }
}

interface AlertInfo {
  type: "repeat_rate_drop" | "labor_cost_spike";
  message: string;
  staffName?: string;
  prevValue?: number;
  currentValue?: number;
  target?: number;
  estimatedWeeklyImpact?: number;
}

function buildAlertEmail(orgName: string, alert: AlertInfo): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";
  const isRepeatDrop = alert.type === "repeat_rate_drop";

  const subjectLine = isRepeatDrop
    ? `⚠️ ${alert.staffName ?? "A staff member"}'s repeat rate dropped significantly`
    : `⚠️ Labor cost spike detected`;

  const impactHtml = alert.estimatedWeeklyImpact && alert.estimatedWeeklyImpact > 0 ? `
    <div style="background:#1f1010;border:1px solid #dc262644;border-radius:10px;padding:14px 18px;margin-bottom:20px;text-align:center;">
      <div style="color:#fca5a5;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Estimated weekly impact</div>
      <div style="color:#f87171;font-size:28px;font-weight:800;">$${Math.round(alert.estimatedWeeklyImpact).toLocaleString()}/week</div>
      <div style="color:#fca5a5;font-size:12px;margin-top:2px;">if not addressed</div>
    </div>` : "";

  const actionHtml = isRepeatDrop ? `
    <div style="background:#172554;border:1px solid #1e40af44;border-radius:10px;padding:16px 18px;margin-top:20px;">
      <div style="color:#93c5fd;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">What to do right now</div>
      <ol style="color:#bfdbfe;font-size:14px;line-height:1.8;margin:0;padding-left:18px;">
        <li>Check if ${alert.staffName ?? "this staff member"} had any schedule changes or customer complaints this week</li>
        <li>Have a 1:1 conversation — drops this size are almost always a specific, identifiable issue</li>
        <li>Consider temporarily shifting them off customer-facing roles while you investigate</li>
      </ol>
    </div>` : `
    <div style="background:#172554;border:1px solid #1e40af44;border-radius:10px;padding:16px 18px;margin-top:20px;">
      <div style="color:#93c5fd;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">What to do right now</div>
      <ol style="color:#bfdbfe;font-size:14px;line-height:1.8;margin:0;padding-left:18px;">
        <li>Open the shift heatmap in your dashboard — the problematic shift is highlighted in red</li>
        <li>Check if that shift is overstaffed or had unexpected slow sales this week</li>
        <li>Reduce headcount on this shift next week until you're back near your ${alert.target ? Math.round(alert.target * 100) + "%" : "target"} labor cost</li>
      </ol>
    </div>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;margin:0;padding:0;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid #1e293b;">
      <span style="color:#3B82F6;font-size:18px;font-weight:800;">Strata</span>
      <span style="color:#dc2626;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;background:#450a0a44;border:1px solid #dc262644;padding:3px 10px;border-radius:20px;">Alert</span>
    </div>

    <!-- Title -->
    <h1 style="color:#f1f5f9;font-size:22px;font-weight:800;margin:0 0 6px;line-height:1.3;">${subjectLine}</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px;">${orgName}</p>

    <!-- Impact stat -->
    ${impactHtml}

    <!-- Alert message -->
    <div style="background:#1e293b;border-left:4px solid #ef4444;border-radius:0 12px 12px 0;padding:18px 20px;margin-bottom:8px;">
      <p style="color:#f1f5f9;font-size:15px;margin:0;line-height:1.7;">${alert.message}</p>
    </div>

    <!-- Action steps -->
    ${actionHtml}

    <!-- CTA -->
    <div style="margin-top:28px;text-align:center;">
      <a href="${appUrl}/dashboard" style="background:#3B82F6;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
        Review in dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="margin-top:24px;text-align:center;">
      <p style="color:#334155;font-size:12px;">
        Strata anomaly alert for ${orgName} ·
        <a href="${appUrl}/dashboard/settings" style="color:#475569;text-decoration:none;">Manage alerts</a>
      </p>
    </div>
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
