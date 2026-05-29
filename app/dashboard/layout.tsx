import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardNav from "@/components/dashboard/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const org = await prisma.organization.findUnique({ where: { clerkUserId: userId } });
  if (!org) redirect("/onboarding");
  if (!org.onboardingDone) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <DashboardNav orgName={org.name} plan={org.plan} />
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
