import { prisma } from "@/lib/prisma";
import { anthropic, INSIGHT_SYSTEM_PROMPT } from "@/lib/anthropic";
import { resend, FROM } from "@/lib/resend";
import { startOfWeek, dayLabel, shiftSlotLabel, formatCurrency, formatPct } from "@/lib/utils";
import { runAttribution } from "./attribution";

interface InsightCard {
  title: string;
  body: string;
  type: string;
  action?: string;
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
  const topInsight = insights[0];
  const subject = topInsight
    ? `${topInsight.title} — your Strata digest is ready`
    : `Your Strata weekly digest — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const topPerformer = contextData.topPerformers[0] ?? null;
  const worstShift = contextData.worstShift;
  const weeklyRevenue = contextData.totalWeeklyRevenue;
  const laborPct = org.laborCostTarget; // rough proxy; real labor pct would need shiftPerf aggregate

  await resend.emails.send({
    from: FROM,
    to: user,
    subject,
    html: buildDigestEmail({
      orgName: org.name,
      insights: top3,
      digestId: digest.id,
      topPerformer,
      worstShift,
      weeklyRevenue,
      laborCostTarget: org.laborCostTarget,
      teamAvgRepeatRate: contextData.teamAvgRepeatRate,
    }),
  });

  await prisma.weeklyDigest.update({
    where: { id: digest.id },
    data: { sentAt: new Date() },
  });
}

interface EmailParams {
  orgName: string;
  insights: InsightCard[];
  digestId: string;
  topPerformer: { name: string; repeatRate: number; revenue: number } | null;
  worstShift: { day: string; slot: string; totalSales: number; laborCost: number; laborPct: number } | null;
  weeklyRevenue: number;
  laborCostTarget: number;
  teamAvgRepeatRate: number;
}

function buildDigestEmail(params: EmailParams): string {
  const { orgName, insights, digestId, topPerformer, worstShift, weeklyRevenue, laborCostTarget, teamAvgRepeatRate } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://strata.ai";
  const weekStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const fmtCurrency = (n: number) => "$" + Math.round(n).toLocaleString();
  const fmtPct = (n: number) => Math.round(n * 100) + "%";

  // Type badge colors
  const typeBadgeColors: Record<string, string> = {
    top_performer: "#16a34a",
    bottom_performer: "#dc2626",
    profitable_shift: "#2563eb",
    unprofitable_shift: "#ea580c",
    repeat_rate_trend: "#7c3aed",
    reallocation: "#ca8a04",
  };
  const typeBadgeLabels: Record<string, string> = {
    top_performer: "Top performer",
    bottom_performer: "Needs attention",
    profitable_shift: "Profitable shift",
    unprofitable_shift: "Losing shift",
    repeat_rate_trend: "Repeat trend",
    reallocation: "Opportunity",
  };

  const insightCards = insights
    .map((i, idx) => {
      const color = typeBadgeColors[i.type] || "#3b82f6";
      const label = typeBadgeLabels[i.type] || i.type.replace(/_/g, " ");
      return `
    <div style="background:#1e293b;border-radius:14px;padding:22px 24px;margin-bottom:14px;border:1px solid #334155;${idx === 0 ? "border-color:#3b82f680;" : ""}">
      <div style="margin-bottom:10px;">
        <span style="display:inline-block;background:${color}22;color:${color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:3px 10px;border-radius:20px;border:1px solid ${color}44;">
          ${label}
        </span>
      </div>
      <div style="color:#f1f5f9;font-size:16px;font-weight:700;line-height:1.4;margin-bottom:10px;">${i.title}</div>
      <div style="color:#94a3b8;font-size:14px;line-height:1.7;margin-bottom:${i.action ? "16px" : "0"};">${i.body}</div>
      ${i.action ? `
      <div style="background:#172554;border:1px solid #1e40af55;border-radius:10px;padding:14px 16px;">
        <div style="color:#93c5fd;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">→ Do this</div>
        <div style="color:#bfdbfe;font-size:14px;line-height:1.65;">${i.action}</div>
      </div>` : ""}
    </div>`;
    })
    .join("");

  // Key metrics bar
  const metricsHtml = `
    <div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px 24px;margin-bottom:28px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#475569;margin-bottom:16px;">This week at a glance</div>
      <div style="display:table;width:100%;border-collapse:collapse;">
        <div style="display:table-row;">
          ${weeklyRevenue > 0 ? `
          <div style="display:table-cell;padding-right:20px;border-right:1px solid #334155;padding-left:0;">
            <div style="color:#93c5fd;font-size:22px;font-weight:800;tabular-nums;">${fmtCurrency(weeklyRevenue)}</div>
            <div style="color:#64748b;font-size:12px;margin-top:2px;">Weekly revenue</div>
          </div>` : ""}
          ${topPerformer ? `
          <div style="display:table-cell;padding:0 20px;border-right:1px solid #334155;">
            <div style="color:#4ade80;font-size:22px;font-weight:800;">${fmtPct(topPerformer.repeatRate)}</div>
            <div style="color:#64748b;font-size:12px;margin-top:2px;">${topPerformer.name}'s repeat rate</div>
          </div>` : ""}
          <div style="display:table-cell;padding-left:20px;">
            <div style="color:${teamAvgRepeatRate >= laborCostTarget ? "#4ade80" : "#f87171"};font-size:22px;font-weight:800;">${fmtPct(teamAvgRepeatRate)}</div>
            <div style="color:#64748b;font-size:12px;margin-top:2px;">Team repeat rate avg</div>
          </div>
        </div>
      </div>
    </div>`;

  // Worst shift callout
  const worstShiftHtml = worstShift && worstShift.laborPct > laborCostTarget * 1.1 ? `
    <div style="background:#450a0a22;border:1px solid #dc262666;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <div style="color:#fca5a5;font-size:13px;font-weight:600;margin-bottom:4px;">⚠️ Attention: Costly shift this week</div>
      <div style="color:#fecaca;font-size:14px;line-height:1.6;">
        <strong>${worstShift.day} ${worstShift.slot}</strong> ran at <strong>${fmtPct(worstShift.laborPct)}</strong> labor cost
        (target: ${fmtPct(laborCostTarget)}) — ${fmtCurrency(worstShift.laborCost)} labor on ${fmtCurrency(worstShift.totalSales)} in sales.
        This single shift costs you <strong>${fmtCurrency(worstShift.laborCost - worstShift.totalSales * laborCostTarget)}</strong> over target per week.
      </div>
    </div>` : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
</head>
<body style="background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #1e293b;">
      <span style="color:#3B82F6;font-size:20px;font-weight:800;letter-spacing:-0.5px;">Strata</span>
      <span style="color:#475569;font-size:12px;">${weekStr}</span>
    </div>

    <!-- Title -->
    <div style="margin-bottom:24px;">
      <h1 style="color:#f8fafc;font-size:28px;font-weight:800;margin:0 0 6px;line-height:1.2;">
        Weekly digest — ${orgName}
      </h1>
      <p style="color:#64748b;font-size:14px;margin:0;">
        ${insights.length} insights ready. Each one has a specific action.
      </p>
    </div>

    <!-- Key metrics -->
    ${metricsHtml}

    <!-- Worst shift callout -->
    ${worstShiftHtml}

    <!-- Section header -->
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#475569;margin-bottom:16px;">
      This week's insights
    </div>

    <!-- Insight cards -->
    ${insightCards}

    <!-- Primary CTA -->
    <div style="margin-top:32px;padding:32px;background:linear-gradient(135deg,#1e3a5f 0%,#1e293b 100%);border-radius:16px;text-align:center;border:1px solid #2563eb44;">
      <div style="color:#f8fafc;font-size:18px;font-weight:700;margin-bottom:8px;">All insights in your dashboard</div>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6;">
        Full shift heatmap, staff comparison, repeat rate trends, and all ${insights.length > 3 ? insights.length + " insights" : "insights"} — with one-click scheduling actions.
      </p>
      <a href="${appUrl}/dashboard" style="background:#3B82F6;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;letter-spacing:-0.2px;">
        Open dashboard →
      </a>
    </div>

    <!-- Footer -->
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #1e293b;text-align:center;">
      <p style="color:#334155;font-size:12px;line-height:1.8;margin:0;">
        <strong style="color:#475569;">Strata</strong> &nbsp;·&nbsp; Staff performance intelligence
        <br>
        <a href="${appUrl}/dashboard/digests" style="color:#475569;text-decoration:none;">Digest archive</a>
        &nbsp;·&nbsp;
        <a href="${appUrl}/dashboard/settings" style="color:#475569;text-decoration:none;">Settings</a>
        &nbsp;·&nbsp;
        <a href="${appUrl}/dashboard/billing" style="color:#475569;text-decoration:none;">Billing</a>
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
