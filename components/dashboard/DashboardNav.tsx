"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Users, CreditCard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/staff", label: "Staff", icon: Users },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export default function DashboardNav({ orgName, plan }: { orgName: string; plan: string }) {
  const path = usePathname();

  return (
    <nav className="bg-slate-950 border-b border-slate-800 px-6 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-blue-500 font-bold text-lg">Strata</Link>
          <div className="h-4 w-px bg-slate-800" />
          <span className="text-slate-400 text-sm truncate max-w-40">{orgName}</span>
          <div className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  path === href ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs font-semibold uppercase px-2 py-1 rounded-md",
            plan === "plus" ? "bg-blue-600/20 text-blue-400" :
            plan === "trial" ? "bg-yellow-600/20 text-yellow-400" :
            "bg-slate-700 text-slate-400"
          )}>
            {plan}
          </span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </nav>
  );
}
