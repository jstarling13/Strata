import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import { CheckCircle, TrendingUp, Users, DollarSign, Gift } from "lucide-react";
import ReferralCapture from "@/components/ReferralCapture";
import { prisma } from "@/lib/prisma";

const VALUE_BULLETS = [
  {
    icon: <DollarSign className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />,
    text: "See exactly which staff members are driving repeat revenue — and which are quietly costing you.",
  },
  {
    icon: <TrendingUp className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />,
    text: "Spot labor overruns before they hit your P&L — get alerts the moment a shift goes off-target.",
  },
  {
    icon: <Users className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />,
    text: "Most owners recover 4–8× the plan cost in labor savings within the first month.",
  },
];

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const ref = typeof searchParams.ref === "string" ? searchParams.ref : null;

  // Look up referrer org name for personalized banner
  let referrerName: string | null = null;
  if (ref) {
    try {
      const referrer = await prisma.organization.findUnique({
        where: { id: ref },
        select: { name: true },
      });
      referrerName = referrer?.name ?? null;
    } catch {
      // If DB lookup fails, just don't show the banner
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-12 items-center">

        {/* Left — value proposition */}
        <div className="flex-1 hidden md:flex flex-col justify-center">
          <div className="mb-8">
            <span className="text-blue-500 font-bold text-2xl tracking-tight">Strata</span>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-semibold">Staff Performance Intelligence</p>
          </div>

          <h1 className="text-3xl font-bold text-slate-100 leading-tight mb-3">
            Turn your POS data into <span className="text-blue-400">profit decisions</span>
          </h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed max-w-sm">
            Connect Square, Toast, or a CSV export. In minutes, you&apos;ll know which staff drive loyalty, which shifts bleed labor, and exactly what to fix first.
          </p>

          <ul className="space-y-4 mb-10">
            {VALUE_BULLETS.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                {b.icon}
                <p className="text-slate-300 text-sm leading-relaxed">{b.text}</p>
              </li>
            ))}
          </ul>

          {/* Social proof */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed italic mb-3">
              &quot;I cut my labor cost from 38% to 31% in six weeks. Strata showed me exactly which shifts to trim — I never would have found it in Square alone.&quot;
            </p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-300 text-xs font-bold">M</div>
              <div>
                <p className="text-slate-200 text-xs font-semibold">Marcus T.</p>
                <p className="text-slate-500 text-xs">Coffee shop owner · Austin, TX</p>
              </div>
              <div className="ml-auto">
                <span className="text-xs text-green-400 font-bold bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">−$2,100/mo</span>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex items-center gap-4 mt-6">
            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-slate-700" />
              14-day free trial
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-slate-700" />
              No credit card required
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-slate-700" />
              Cancel any time
            </div>
          </div>
        </div>

        {/* Right — Clerk sign-up */}
        <div className="w-full md:w-auto flex flex-col items-center gap-4">
          {/* Silently capture referral param into localStorage */}
          <Suspense fallback={null}><ReferralCapture /></Suspense>

          {/* Personalized referral banner */}
          {referrerName && (
            <div className="w-full max-w-sm bg-gradient-to-r from-blue-600/20 to-purple-600/10 border border-blue-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
              <Gift className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-200 text-sm font-semibold leading-snug">
                  {referrerName} invited you
                </p>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  Start your free 14-day trial. When you upgrade, they earn a free month — no cost to you.
                </p>
              </div>
            </div>
          )}

          {/* Mobile logo */}
          <div className="md:hidden text-center">
            <span className="text-blue-500 font-bold text-2xl">Strata</span>
            <p className="text-slate-500 text-sm mt-1">14-day free trial · No credit card required</p>
          </div>

          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-slate-900 border border-slate-800 shadow-xl rounded-2xl",
                headerTitle: "text-slate-100",
                headerSubtitle: "text-slate-400",
                formFieldLabel: "text-slate-300",
                formFieldInput: "bg-slate-800 border-slate-700 text-slate-100 focus:border-blue-500",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-500",
                footerActionLink: "text-blue-400 hover:text-blue-300",
                dividerLine: "bg-slate-800",
                dividerText: "text-slate-600",
                socialButtonsBlockButton: "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300",
                identityPreviewText: "text-slate-300",
                formFieldSuccessText: "text-green-400",
              },
            }}
          />
        </div>

      </div>
    </div>
  );
}
