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

  const alerts: { type: "repeat_rate_drop" | "labor_cost_spike"; message: string }[] = [];

  for (const stat of currentStats) {
    const prev = prevMap.get(stat.staffId);
    if (!prev) continue;
    const drop = prev.repeatRate - stat.repeatRate;
    if (drop > 0.15) {
      alerts.push({
        type: "repeat_rate_drop",
        message: `${stat.staff.displayName}'s repeat customer rate dropped from ${formatPct(prev.repeatRate)} to ${formatPct(stat.repeatRate)} this week — a ${formatPct(drop)} decline.`,
      });
    }
  }

  const shifts = await prisma.shiftPerformance.findMany({ where: { orgId, weekOf } });
  for (const shift of shifts) {
    if (shift.laborPct > org.laborCostTarget * 1.5) {
      const { dayLabel, shiftSlotLabel } = await import("@/lib/utils");
      alerts.push({
        type: "labor_cost_spike",
        message: `${dayLabel(shift.dayOfWeek)} ${shiftSlotLabel(shift.shiftSlot)} labor cost hit ${formatPct(shift.laborPct)} of sales — ${formatPct(shift.laborPct - org.laborCostTarget)} above your ${formatPct(org.laborCostTarget)} target.`,
      });
    }
  }

  if (alerts.length === 0) return;

  const user = await getUserEmail(org.clerkUserId);
  for (const alert of alerts) {
    const record = await prisma.anomalyAlert.create({
      data: { orgId, type: alert.type, message: alert.message },
    });

    if (user) {
      await resend.emails.send({
        from: FROM,
        to: user,
        subject: "Something shifted in your numbers this week — Strata",
        html: buildAlertEmail(org.name, alert.message),
      });
      await prisma.anomalyAlert.update({ where: { id: record.id }, data: { sentAt: new Date() } });
    }
  }
}

function buildAlertEmail(orgName: string, message: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";
  return `
<!DOCTYPE html>
<html>
<body style="background:#0f172a;font-family:Inter,sans-serif;padding:40px 20px;margin:0;">
  <div style="max-width:560px;margin:0 auto;">
    <span style="color:#3B82F6;font-size:20px;font-weight:700;">Strata</span>
    <h1 style="color:#f1f5f9;font-size:20px;font-weight:700;margin-top:24px;">Something shifted in your numbers</h1>
    <p style="color:#94a3b8;font-size:14px;">${orgName}</p>
    <div style="background:#1e293b;border-left:3px solid #ef4444;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0;">
      <p style="color:#f1f5f9;font-size:15px;margin:0;line-height:1.6;">${message}</p>
    </div>
    <a href="${appUrl}/dashboard" style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">View dashboard →</a>
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
