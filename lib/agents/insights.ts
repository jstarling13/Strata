import { prisma } from "@/lib/prisma";
import { anthropic, INSIGHT_SYSTEM_PROMPT } from "@/lib/anthropic";
import { resend, FROM } from "@/lib/resend";
import { startOfWeek, dayLabel, shiftSlotLabel, formatCurrency, formatPct } from "@/lib/utils";
import { runAttribution } from "./attribution";

interface InsightCard {
  title: string;
  body: string;
  type: string;
}

export async function generateWeeklyDigest(orgId: string) {
  await runAttribution(orgId);

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    include: { staffMembers: true },
  });

  const weekOf = startOfWeek(new Date());

  // Get this week's staff stats
  const staffStats = await prisma.staffWeeklyStats.findMany({
    where: { orgId, weekOf },
    include: { staff: true },
    orderBy: { repeatRate: "desc" },
  });

  // Get previous week stats for comparison
  const prevWeek = new Date(weekOf);
  prevWeek.setDate(prevWeek.getDate() - 7);
  const prevStats = await prisma.staffWeeklyStats.findMany({
    where: { orgId, weekOf: prevWeek },
  });
  const prevMap = new Map(prevStats.map((s) => [s.staffId, s]));

  // Get shift performance this week
  const shiftPerf = await prisma.shiftPerformance.findMany({
    where: { orgId, weekOf },
    orderBy: { laborPct: "asc" },
  });

  const top3Staff = staffStats.slice(0, 3);
  const bottom3Staff = [...staffStats].reverse().slice(0, 3);

  const bestShift = shiftPerf[0];
  const worstShift = shiftPerf[shiftPerf.length - 1];

  const contextData = {
    orgName: org.name,
    orgType: org.type,
    laborCostTarget: org.laborCostTarget,
    weekOf: weekOf.toISOString().split("T")[0],
    topPerformers: top3Staff.map((s) => ({
      name: s.staff.displayName,
      role: s.staff.role,
      repeatRate: s.repeatRate,
      avgTicket: s.avgTicket,
      revenue: s.revenue,
      transactions: s.transactions,
      prevRepeatRate: prevMap.get(s.staffId)?.repeatRate ?? null,
    })),
    bottomPerformers: bottom3Staff.map((s) => ({
      name: s.staff.displayName,
      role: s.staff.role,
      repeatRate: s.repeatRate,
      avgTicket: s.avgTicket,
      revenue: s.revenue,
      transactions: s.transactions,
    })),
    bestShift: bestShift
      ? {
          day: dayLabel(bestShift.dayOfWeek),
          slot: shiftSlotLabel(bestShift.shiftSlot),
          totalSales: bestShift.totalSales,
          laborCost: bestShift.laborCost,
          laborPct: bestShift.laborPct,
        }
      : null,
    worstShift: worstShift
      ? {
          day: dayLabel(worstShift.dayOfWeek),
          slot: shiftSlotLabel(worstShift.shiftSlot),
          totalSales: worstShift.totalSales,
          laborCost: worstShift.laborCost,
          laborPct: worstShift.laborPct,
        }
      : null,
    teamAvgRepeatRate:
      staffStats.length > 0
        ? staffStats.reduce((s, m) => s + m.repeatRate, 0) / staffStats.length
        : 0,
    totalWeeklyRevenue: staffStats.reduce((s, m) => s + m.revenue, 0),
  };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: INSIGHT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is the performance data for ${org.name} for the week of ${contextData.weekOf}:\n\n${JSON.stringify(contextData, null, 2)}\n\nGenerate the weekly digest insights as a JSON array.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  let insights: InsightCard[] = [];
  try {
    const match = text.match(/\[[\s\S]*\]/);
    insights = match ? JSON.parse(match[0]) : [];
  } catch {
    insights = [{ title: "Weekly Summary", body: text, type: "top_performer" }];
  }

  const plainText = insights.map((i) => `${i.title}: ${i.body}`).join("\n\n");

  const digest = await prisma.weeklyDigest.upsert({
    where: { orgId_weekOf: { orgId, weekOf } },
    create: { orgId, weekOf, insightsJson: insights, plainText, generatedAt: new Date() },
    update: { insightsJson: insights, plainText, generatedAt: new Date() },
  });

  return { digest, insights };
}

export async function sendWeeklyDigestEmail(orgId: string) {
  const { digest, insights } = await generateWeeklyDigest(orgId);

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const user = await getUserEmail(org.clerkUserId);
  if (!user) return;

  const top3 = insights.slice(0, 3);

  await resend.emails.send({
    from: FROM,
    to: user,
    subject: `Your Strata weekly digest is ready — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    html: buildDigestEmail(org.name, top3, digest.id),
  });

  await prisma.weeklyDigest.update({
    where: { id: digest.id },
    data: { sentAt: new Date() },
  });
}

function buildDigestEmail(orgName: string, insights: InsightCard[], digestId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";
  const insightCards = insights
    .map(
      (i) => `
    <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:16px;">
      <div style="color:#3B82F6;font-size:12px;font-weight:600;text-transform:uppercase;margin-bottom:8px;">${i.type.replace("_", " ")}</div>
      <div style="color:#f1f5f9;font-size:16px;font-weight:600;margin-bottom:8px;">${i.title}</div>
      <div style="color:#94a3b8;font-size:14px;line-height:1.6;">${i.body}</div>
    </div>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0f172a;font-family:Inter,sans-serif;padding:40px 20px;margin:0;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="margin-bottom:32px;">
      <span style="color:#3B82F6;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Strata</span>
    </div>
    <h1 style="color:#f1f5f9;font-size:24px;font-weight:700;margin-bottom:8px;">Your weekly performance digest</h1>
    <p style="color:#94a3b8;font-size:14px;margin-bottom:32px;">${orgName} · Week of ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    ${insightCards}
    <div style="margin-top:32px;text-align:center;">
      <a href="${appUrl}/dashboard" style="background:#3B82F6;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">See full report →</a>
    </div>
    <p style="color:#475569;font-size:12px;margin-top:40px;text-align:center;">Strata · <a href="${appUrl}/dashboard/billing" style="color:#475569;">Manage subscription</a></p>
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
