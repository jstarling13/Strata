"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Users, CreditCard, BookOpen, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/staff", label: "Staff", icon: Users, exact: false },
  { href: "/dashboard/digests", label: "Digests", icon: BookOpen, exact: false },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell, exact: false },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard, exact: false },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, exact: false },
];

// Mobile bottom nav only shows the 4 most important items
const MOBILE_NAV = NAV.slice(0, 4);

export default function DashboardNav({ orgName, plan }: { orgName: string; plan: string }) {
  const path = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? path === href : path.startsWith(href);
  }

  return (
    <>
      {/* Desktop top nav */}
      <nav className="bg-slate-950 border-b border-slate-800 px-4 sm:px-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/" className="text-blue-500 font-bold text-lg shrink-0">Strata</Link>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <span className="text-slate-400 text-sm truncate max-w-28 sm:max-w-40 hidden sm:block">{orgName}</span>
            {/* Show all nav on desktop, hide on mobile (mobile uses bottom nav) */}
            <div className="hidden md:flex items-center gap-1">
              {NAV.map(({ href, label, icon: Icon, exact }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    isActive(href, exact) ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={cn(
              "text-xs font-semibold uppercase px-2 py-1 rounded-md hidden sm:inline",
              plan === "plus" ? "bg-blue-600/20 text-blue-400" :
              plan === "standard" ? "bg-green-600/20 text-green-400" :
              plan === "trial" ? "bg-yellow-600/20 text-yellow-400" :
              "bg-slate-700 text-slate-400"
            )}>
              {plan}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 pb-2">
        <div className="flex items-center justify-around">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-3 transition-colors min-w-0",
                  active ? "text-blue-400" : "text-slate-500"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-xs font-medium truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
