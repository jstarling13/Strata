import Link from "next/link";
import { ArrowRight, BarChart3, Users, TrendingUp, CheckCircle, ChevronDown } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-blue-500 font-bold text-xl tracking-tight">Strata</span>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="text-slate-400 hover:text-slate-100 text-sm transition-colors">How it works</a>
            <a href="#pricing" className="text-slate-400 hover:text-slate-100 text-sm transition-colors">Pricing</a>
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
            Now with Square + Toast direct integration
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight mb-6">
            Your POS tracks sales.{" "}
            <span className="text-blue-500">Strata tells you who&apos;s driving them.</span>
          </h1>
          <p className="text-slate-400 text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            Connect your Square, Toast, or Vagaro data. In 24 hours, Strata shows you which employees generate repeat customers, which shifts are costing you more than they earn, and exactly where to reallocate hours to make more money.
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

      {/* Pain cards */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-slate-400 text-sm font-semibold uppercase tracking-widest mb-12">
            You feel it in your gut. Strata puts it in numbers.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                gut: "You know Thursday lunch is slow.",
                data: `But do you know it costs you $340 in labor to generate $180 in sales — a 189% labor ratio that bleeds $160 every week?`,
                icon: <TrendingUp className="w-5 h-5 text-red-400" />,
              },
              {
                gut: "You know customers love certain staff.",
                data: "But do you know those employees have a 68% repeat customer rate vs your 31% average — 2.2× the loyalty of your typical hire?",
                icon: <Users className="w-5 h-5 text-blue-400" />,
              },
              {
                gut: "You know some shifts underperform.",
                data: "But do you know which ones, by exactly how much, and which staff reassignment recovers the most revenue?",
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
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Up and running in minutes</h2>
          <p className="text-slate-400 text-center mb-16">No complicated setup. No IT department.</p>
          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Connect your POS",
                body: "One-click OAuth with Square or Toast. Or export a CSV from any system — Strata auto-detects your columns.",
              },
              {
                step: "02",
                title: "Tell us your labor costs",
                body: "Enter average hourly rates by role. This is what makes shift profitability real — not just revenue, but revenue minus what you paid to earn it.",
              },
              {
                step: "03",
                title: "Get your weekly digest",
                body: "Every week, a plain-English performance report lands in your inbox. Specific employees, specific shifts, specific numbers. No dashboards to learn.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-8 items-start">
                <span className="text-4xl font-bold text-blue-500/30 tabular-nums w-12 shrink-0 text-right">{item.step}</span>
                <div className="pt-1">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.body}</p>
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
          <div className="flex flex-wrap justify-center gap-8 items-center">
            {["Square", "Toast", "Vagaro", "CSV from any POS"].map((name) => (
              <div key={name} className="bg-slate-800 rounded-xl px-6 py-3 text-slate-300 font-medium text-sm border border-slate-700">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 text-center mb-16">
            {[
              { value: "23%", label: "average labor cost reduction in first 60 days" },
              { value: "2.4×", label: "increase in repeat customer attribution accuracy" },
              { value: "$1,800", label: "median monthly recovered revenue per location" },
            ].map((stat) => (
              <div key={stat.value} className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
                <div className="text-4xl font-bold text-blue-400 mb-2">{stat.value}</div>
                <div className="text-slate-400 text-sm leading-relaxed">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Straightforward pricing</h2>
          <p className="text-slate-400 text-center mb-4">One unprofitable shift costs more than a month of Strata.</p>
          <p className="text-slate-500 text-center text-sm mb-16">14-day free trial. No credit card required.</p>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                name: "Standard",
                price: "$129",
                period: "/month",
                description: "For single-location businesses",
                features: [
                  "1 location",
                  "Weekly performance digest",
                  "Up to 20 staff members",
                  "Shift profitability heatmap",
                  "Repeat customer attribution",
                  "Square + Toast integration",
                ],
                cta: "Start free trial",
                highlight: false,
              },
              {
                name: "Plus",
                price: "$229",
                period: "/month",
                description: "For multi-location operators",
                features: [
                  "Up to 4 locations",
                  "Daily insights + anomaly alerts",
                  "Unlimited staff members",
                  "Direct API integrations",
                  "Email anomaly alerts",
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
                <div className="mb-2">
                  <span className="text-2xl font-bold">{plan.name}</span>
                </div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-slate-400 mb-1">{plan.period}</span>
                </div>
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
                  className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
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
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6">
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
                a: "For Square and Toast, we match by the customer's card or customer ID in your POS. For CSV uploads, we match by any customer identifier column you provide.",
              },
              {
                q: "How accurate is the shift profitability calculation?",
                a: "It's based on the hourly rates you enter per role, multiplied by estimated headcount for each shift slot. The more accurately you enter your labor costs, the sharper the numbers.",
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

      {/* CTA */}
      <section className="py-24 px-6 bg-blue-600/5 border-t border-blue-500/10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Start knowing, not guessing</h2>
          <p className="text-slate-400 mb-8">14 days free. Connect in minutes. Your first digest in 24 hours.</p>
          <Link href="/sign-up" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors">
            Get started free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-blue-500 font-bold">Strata</span>
          <p className="text-slate-600 text-sm">See the performance layers your POS never showed you.</p>
          <div className="flex gap-4 text-slate-600 text-sm">
            <Link href="/sign-in" className="hover:text-slate-400 transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-slate-400 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
