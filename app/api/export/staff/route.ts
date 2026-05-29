import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { startOfWeek } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const weekOf = startOfWeek(new Date());

  const staffStats = await prisma.staffWeeklyStats.findMany({
    where: { orgId: org.id, weekOf },
    include: { staff: true },
    orderBy: { repeatRate: "desc" },
  });

  // Build CSV
  const headers = ["Name", "Role", "Transactions", "Avg Ticket", "Repeat Rate", "Revenue", "Hourly Rate"];
  const rows = staffStats.map((s) => [
    s.staff.displayName,
    s.staff.role || "",
    s.transactions,
    s.avgTicket.toFixed(2),
    (s.repeatRate * 100).toFixed(1) + "%",
    s.revenue.toFixed(2),
    s.staff.hourlyRate?.toFixed(2) || "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");

  const weekStr = weekOf.toISOString().split("T")[0];
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="strata-staff-${weekStr}.csv"`,
    },
  });
}
