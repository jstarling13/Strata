import Link from "next/link";
import { ArrowRight, BarChart3, Users, TrendingUp, CheckCircle, Bell, Sparkles, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-blue-500 font-bold text-xl tracking-tight">Strata</span>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="text-slate-400 hover:text-slate-100 text-sm transition-colors hidden sm:block">How it works</a>
            <a href="#pricing" className="text-slate-400 hover:text-slate-100 text-sm transition-colors hidden sm:block">Pricing</a>
            <Link href="/sign-in" className="text-slate-400 hover:text-slate-100 text-sm transition-colors">Sign in</Link>
            <Link href="/sign-up" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-400 text-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Square · Toast · Clover · CSV — all supported
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
            Your POS tracks sales.{" "}
            <span className="text-blue-500">Strata tells you who&apos;s driving them.</span>
          </h1>
          <p className="text-slate-400 text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            Connect your POS in minutes. Strata analyzes 90 days of transactions and shows you which employees bring customers back, which shifts cost more than they earn, and exactly where to move hours to make more money.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
              Start 14-day free trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/demo" className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
              See live demo →
            </Link>
          </div>
          <p className="text-slate-500 text-sm mt-4">No credit card required · 14-day free trial · <Link href="/demo" className="text-blue-500 hover:text-blue-400 underline underline-offset-2">or try the live demo first</Link></p>
        </div>
      </section>

      {/* ROI stats bar */}
      <section className="py-12 px-6 border-y border-slate-800 bg-slate-900/60">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { value: "23%", label: "average labor cost reduction in first 60 days" },
              { value: "$1,800", label: "median monthly revenue recovered per location" },
              { value: "2.4×", label: "improvement in repeat customer attribution" },
            ].map((stat) => (
              <div key={stat.value}>
                <div className="text-3xl sm:text-4xl font-bold text-blue-400 mb-1">{stat.value}</div>
                <div className="text-slate-500 text-xs sm:text-sm leading-relaxed">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain cards */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-slate-400 text-sm font-semibold uppercase tracking-widest mb-12">
            You feel it in your gut. Strata puts it in numbers.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                gut: "You know Thursday lunch is slow.",
                data: "But do you know it costs you $340 in labor to generate $180 in sales — a 189% labor ratio bleeding $160 every week?",
                icon: <TrendingUp className="w-5 h-5 text-red-400" />,
              },
              {
                gut: "You know customers love certain staff.",
                data: "But do you know those employees have a 68% repeat rate vs your 31% average — 2.2× the loyalty of a typical hire?",
                icon: <Users className="w-5 h-5 text-blue-400" />,
              },
              {
                gut: "You know some shifts underperform.",
                data: "But do you know which ones, by exactly how much, and which staff change recovers the most revenue?",
                icon: <BarChart3 className="w-5 h-5 text-yellow-400" />,
              },
            ].map((card, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
                <div className="flex items-center gap-2 mb-4">
                  {card.icon}
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">The gut feeling</span>
                </div>
                <p className="text-slate-300 font-medium text-lg mb-4 leading-snug">&ldquo;{card.gut}&rdquo;</p>
                <div className="border-t border-slate-800 pt-4">
                  <span className="text-xs text-blue-400 uppercase tracking-widest font-semibold block mb-2">What Strata shows you</span>
                  <p className="text-slate-400 text-sm leading-relaxed">{card.data}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-900/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Up and running in minutes</h2>
          <p className="text-slate-400 text-center mb-16">No complicated setup. No IT department. Cancel any time.</p>
          <div className="space-y-10">
            {[
              {
                step: "01",
                title: "Connect your POS",
                body: "One-click OAuth with Square, Toast, or Clover. Or export a CSV from any system — Strata auto-detects your columns with AI.",
                icon: <BarChart3 className="w-5 h-5 text-blue-400" />,
              },
              {
                step: "02",
                title: "Tell us your labor costs",
                body: "Enter average hourly rates by role. This makes shift profitability real — not just revenue, but revenue minus what you paid to earn it.",
                icon: <Users className="w-5 h-5 text-green-400" />,
              },
              {
                step: "03",
                title: "Get your weekly digest in 24 hours",
                body: "A plain-English performance report lands in your inbox every week. Specific employees, specific shifts, specific dollar amounts. One action item per insight.",
                icon: <Sparkles className="w-5 h-5 text-purple-400" />,
              },
              {
                step: "04",
                title: "Get instant alerts when something changes",
                body: "Plus plan users get immediate email alerts when a repeat rate drops or a shift spikes. Know before it costs you.",
                icon: <Bell className="w-5 h-5 text-amber-400" />,
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-8 items-start">
                <span className="text-4xl font-bold text-blue-500/30 tabular-nums w-12 shrink-0 text-right">{item.step}</span>
                <div className="pt-1">
                  <div className="flex items-center gap-2 mb-2">
                    {item.icon}
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                  </div>
                  <p className="text-slate-400 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get in your first week */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">What your first week looks like</h2>
          <p className="text-slate-400 text-center mb-12">From sign-up to your first actionable insight in under 24 hours.</p>
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-800" />
            {[
              { time: "Day 0, 5 min", title: "Connect your POS", desc: "OAuth or CSV upload. Strata pulls your last 90 days automatically." },
              { time: "Day 0, 24 hrs", title: "First weekly digest arrives", desc: "Your email inbox gets a plain-English breakdown of every key insight — with a specific action for each one." },
              { time: "Day 1", title: "Dashboard is live", desc: "Staff performance table, shift heatmap, and benchmark comparisons — all auto-populated from your real data." },
              { time: "Week 1", title: "First scheduling decision", desc: "Most owners make their first staffing change in week 1. The average shift cost improvement is 18%." },
            ].map((item, i) => (
              <div key={i} className="flex gap-8 items-start mb-8 last:mb-0">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 z-10">
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div className="pb-2">
                  <div className="text-blue-400 text-xs font-semibold uppercase tracking-wide mb-1">{item.time}</div>
                  <h3 className="font-semibold text-slate-100 mb-1">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 px-6 border-y border-slate-800 bg-slate-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-500 text-sm uppercase tracking-widest font-semibold mb-8">Works with your existing systems</p>
          <div className="flex flex-wrap justify-center gap-4 items-center">
            {[
              { name: "Square", badge: "OAuth" },
              { name: "Toast", badge: "API key" },
              { name: "Clover", badge: "OAuth" },
              { name: "Any POS", badge: "CSV" },
            ].map(({ name, badge }) => (
              <div key={name} className="bg-slate-800 rounded-xl px-5 py-3 text-slate-300 font-medium text-sm border border-slate-700 flex items-center gap-2">
                {name}
                <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Straightforward pricing</h2>
          <p className="text-slate-400 text-center mb-2">One unprofitable shift costs more than a month of Strata.</p>
          <p className="text-slate-500 text-center text-sm mb-16">14-day free trial. No credit card required. Cancel any time.</p>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                name: "Standard",
                price: "$129",
                period: "/month",
                annual: "$83/mo billed annually",
                description: "For single-location businesses ready to stop guessing.",
                features: [
                  "1 location, up to 20 staff",
                  "Weekly AI performance digest",
                  "Shift profitability heatmap",
                  "Repeat customer attribution",
                  "Square, Toast & Clover integration",
                  "CSV upload with AI column detection",
                ],
                cta: "Start free trial",
                highlight: false,
              },
              {
                name: "Plus",
                price: "$229",
                period: "/month",
                annual: "$167/mo billed annually",
                description: "For operators who want daily intelligence and instant alerts.",
                features: [
                  "Up to 4 locations, unlimited staff",
                  "Everything in Standard",
                  "Anomaly alerts via email (instant)",
                  "Labor cost spike detection",
                  "Repeat rate drop notifications",
                  "Priority support",
                ],
                cta: "Start free trial",
                highlight: true,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 flex flex-col ${
                  plan.highlight
                    ? "bg-blue-600/10 border-blue-500/40"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                {plan.highlight && (
                  <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">Most popular</span>
                )}
                <div className="mb-1">
                  <span className="text-2xl font-bold">{plan.name}</span>
                </div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-slate-400 mb-1">{plan.period}</span>
                </div>
                <div className="text-slate-500 text-xs mb-3">or {plan.annual} · save 35%</div>
                <p className="text-slate-400 text-sm mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-100"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">
            Need more than 4 locations?{" "}
            <a href="mailto:hello@strata.ai" className="text-blue-400 hover:text-blue-300 transition-colors">Contact us</a> for enterprise pricing.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-slate-900/40">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Common questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Does Strata access my employees' personal information?",
                a: "No. We only use transaction data: which staff ID processed a transaction, the sale amount, the time, and whether that customer returned. No names are required — Strata works with any identifier your POS assigns.",
              },
              {
                q: "What if I use a POS not listed?",
                a: "Any system that can export transactions to CSV works with Strata. We use AI to auto-detect your column structure — just upload the file and we'll map it.",
              },
              {
                q: "Can my employees see this data?",
                a: "No. Only the account owner and anyone they explicitly invite as an admin can access Strata data.",
              },
              {
                q: "How does Strata know if a customer 'returned'?",
                a: "For Square, Toast, and Clover, we match by the customer's card or customer ID in your POS. For CSV uploads, we match by any customer identifier column you provide.",
              },
              {
                q: "How accurate is the shift profitability calculation?",
                a: "It's based on the hourly rates you enter per role, multiplied by estimated headcount for each shift slot. The more accurately you enter your labor costs, the sharper the numbers.",
              },
              {
                q: "What happens after the trial?",
                a: "After 14 days, you choose a plan or your account pauses — no charge, no data deleted. Your history stays intact if you come back.",
              },
            ].map((item) => (
              <div key={item.q} className="border-b border-slate-800 pb-6">
                <h3 className="font-semibold text-slate-100 mb-3">{item.q}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-blue-600/5 border-t border-blue-500/10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Start knowing, not guessing</h2>
          <p className="text-slate-400 mb-2">14 days free. Connect in minutes. Your first digest in 24 hours.</p>
          <p className="text-slate-500 text-sm mb-8">No credit card. No commitment. Cancel any time.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-up" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
              Get started free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/demo" className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
              See live demo first →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-blue-500 font-bold">Strata</span>
          <p className="text-slate-600 text-sm">See the performance layers your POS never showed you.</p>
          <div className="flex gap-6 text-slate-600 text-sm">
            <Link href="/demo" className="hover:text-slate-400 transition-colors">Demo</Link>
            <Link href="/sign-in" className="hover:text-slate-400 transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-slate-400 transition-colors">Sign up</Link>
            <a href="mailto:hello@strata.ai" className="hover:text-slate-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
