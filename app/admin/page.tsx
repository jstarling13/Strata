import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminClient from "./AdminClient";

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "").split(",").filter(Boolean);

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId || !ADMIN_USER_IDS.includes(userId)) redirect("/dashboard");

  const orgs = await prisma.organization.findMany({
    include: {
      dataSources: { select: { type: true, status: true, lastSyncAt: true } },
      weeklyDigests: { orderBy: { weekOf: "desc" }, take: 1 },
      anomalyAlerts: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
  });

  const mrr = orgs.reduce((sum, org) => {
    if (org.plan === "standard") return sum + 129;
    if (org.plan === "plus") return sum + 229;
    return sum;
  }, 0);

  return <AdminClient orgs={JSON.parse(JSON.stringify(orgs))} mrr={mrr} />;
}
