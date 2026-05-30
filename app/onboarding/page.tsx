"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, ArrowLeft, CheckCircle, Upload, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Business info", "Connect data", "Labor costs", "Baseline", "Confirm"];

type OrgType = "restaurant" | "cafe" | "salon" | "gym" | "retail" | "other";

const DEFAULT_LABOR_TARGETS: Record<OrgType, number> = {
  restaurant: 0.3,
  cafe: 0.32,
  salon: 0.35,
  gym: 0.28,
  retail: 0.25,
  other: 0.3,
};

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [type, setType] = useState<OrgType>("restaurant");
  const [locationCount, setLocationCount] = useState(1);
  const [staffCount, setStaffCount] = useState(5);

  // Step 2
  const [dataSource, setDataSource] = useState<"square" | "toast" | "csv" | "clover" | null>(null);
  const [toastApiKey, setToastApiKey] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any>(null);
  const [csvUploading, setCsvUploading] = useState(false);

  // Step 3
  const [roles, setRoles] = useState([{ role: "Server", hourlyRate: 15 }]);

  // Step 4
  const [laborTarget, setLaborTarget] = useState(0.3);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stepParam = searchParams.get("step");
    const connected = searchParams.get("connected");
    if (stepParam) setStep(parseInt(stepParam));
    if (connected) setDataSource(connected as any);
  }, [searchParams]);

  useEffect(() => {
    setLaborTarget(DEFAULT_LABOR_TARGETS[type]);
  }, [type]);

  async function saveBusinessInfo() {
    setLoading(true);
    try {
      // Pass referral if one was captured at sign-up
      let referredByOrgId: string | undefined;
      try { referredByOrgId = localStorage.getItem("strata_referral") ?? undefined; } catch {}

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, type, locationCount, staffCount, laborCostTarget: laborTarget, staffRoles: roles,
          ...(referredByOrgId ? { referredByOrgId } : {}),
        }),
      });
      const data = await res.json();
      if (data.orgId) setOrgId(data.orgId);

      // Clear the referral once saved so it doesn't re-link on re-submission
      try { localStorage.removeItem("strata_referral"); } catch {}

      setStep(2);
    } finally {
      setLoading(false);
    }
  }

  async function handleCSVPreview() {
    if (!csvFile) return;
    setCsvUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      fd.append("preview", "true");
      const res = await fetch("/api/csv-upload", { method: "POST", body: fd });
      const data = await res.json();
      setCsvPreview(data);
    } finally {
      setCsvUploading(false);
    }
  }

  async function handleCSVUpload() {
    if (!csvFile) return;
    setCsvUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      await fetch("/api/csv-upload", { method: "POST", body: fd });
      setStep(3);
    } finally {
      setCsvUploading(false);
    }
  }

  async function connectToast() {
    if (!toastApiKey) return;
    setLoading(true);
    try {
      const res = await fetch("/api/toast/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: toastApiKey }),
      });
      if (res.ok) {
        setDataSource("toast");
      } else {
        const err = await res.json();
        alert(err.error || "Could not connect to Toast. Check your API key.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function complete() {
    setLoading(true);
    try {
      // Save final labor costs and target before completing
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_labor", staffRoles: roles, laborCostTarget: laborTarget }),
      });
      await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      router.push("/dashboard?welcome=1");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <span className="text-blue-500 font-bold text-lg">Strata</span>
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  i + 1 < step ? "bg-blue-600 text-white" : i + 1 === step ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500" : "bg-slate-800 text-slate-500"
                )}
              >
                {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={cn("w-6 h-px", i + 1 < step ? "bg-blue-600" : "bg-slate-700")} />}
            </div>
          ))}
        </div>
        <div className="text-slate-500 text-sm">Step {step} of {STEPS.length}</div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">

          {/* Step 1: Business info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">Tell us about your business</h1>
                <p className="text-slate-400 text-sm">We&apos;ll tailor your performance benchmarks to your type of business.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Business name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maria's Kitchen"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Business type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(["restaurant", "cafe", "salon", "gym", "retail", "other"] as OrgType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={cn(
                        "py-3 rounded-xl border text-sm font-medium capitalize transition-colors",
                        type === t ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Number of locations</label>
                  <input
                    type="number"
                    min={1}
                    value={locationCount}
                    onChange={(e) => setLocationCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Number of staff</label>
                  <input
                    type="number"
                    min={1}
                    value={staffCount}
                    onChange={(e) => setStaffCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={saveBusinessInfo}
                disabled={!name || loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* Step 2: Connect data */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">Connect your data</h1>
                <p className="text-slate-400 text-sm">Choose how you want to get your transaction history into Strata.</p>
              </div>

              {/* Square */}
              <div className={cn("border rounded-2xl p-6 transition-colors", dataSource === "square" ? "border-blue-500 bg-blue-600/5" : "border-slate-700 bg-slate-900 hover:border-slate-600")}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-slate-100 mb-0.5">Square</div>
                    <div className="text-slate-400 text-sm">One-click OAuth. Read-only access to transactions, customers, and employees.</div>
                  </div>
                  {dataSource === "square" && <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />}
                </div>
                {dataSource === "square" ? (
                  <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Connected to Square
                  </div>
                ) : (
                  <a href="/api/square/oauth" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    Connect Square <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Toast */}
              <div className={cn("border rounded-2xl p-6 transition-colors", dataSource === "toast" ? "border-blue-500 bg-blue-600/5" : "border-slate-700 bg-slate-900 hover:border-slate-600")}>
                <div className="font-semibold text-slate-100 mb-0.5">Toast</div>
                <div className="text-slate-400 text-sm mb-4">Enter your Toast API key. Find it in Toast Web → Integrations → API Access.</div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={toastApiKey}
                    onChange={(e) => setToastApiKey(e.target.value)}
                    placeholder="T1-XXXXXXXXXXXX"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={connectToast}
                    disabled={!toastApiKey || loading}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Connect"}
                  </button>
                </div>
              </div>

              {/* Clover */}
              <div className={cn("border rounded-2xl p-6 transition-colors", dataSource === "clover" ? "border-blue-500 bg-blue-600/5" : "border-slate-700 bg-slate-900 hover:border-slate-600")}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold text-slate-100 mb-0.5">Clover</div>
                    <div className="text-slate-400 text-sm">One-click OAuth. Works with all Clover restaurant and retail setups.</div>
                  </div>
                  {dataSource === "clover" && <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />}
                </div>
                {dataSource === "clover" ? (
                  <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" /> Connected to Clover
                  </div>
                ) : (
                  <a href="/api/clover/connect" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    Connect Clover <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* CSV */}
              <div className={cn("border rounded-2xl p-6 transition-colors", dataSource === "csv" ? "border-blue-500 bg-blue-600/5" : "border-slate-700 bg-slate-900 hover:border-slate-600")}>
                <div className="font-semibold text-slate-100 mb-0.5">CSV upload</div>
                <div className="text-slate-400 text-sm mb-4">Export your transaction history from any POS. Strata auto-detects your column structure.</div>
                <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400 font-mono mb-4">
                  date,staff_id,customer_id,amount,tip<br />
                  2024-01-15 12:34,EMP001,CUST123,42.50,8.00<br />
                  2024-01-15 12:51,EMP002,CUST456,28.00,5.00
                </div>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { setCsvFile(e.target.files?.[0] || null); setCsvPreview(null); }} />
                {!csvFile ? (
                  <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                    <Upload className="w-4 h-4" /> Choose CSV file
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-400" /> {csvFile.name}
                    </div>
                    {!csvPreview ? (
                      <button onClick={handleCSVPreview} disabled={csvUploading} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                        {csvUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preview & map columns"}
                      </button>
                    ) : (
                      <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-1">
                        <div className="text-slate-400 text-xs uppercase tracking-wide font-semibold mb-2">Detected columns</div>
                        {Object.entries(csvPreview.columnMap).filter(([, v]) => v).map(([k, v]: any) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-slate-400">{k}</span>
                            <span className="text-slate-200 font-mono">{v}</span>
                          </div>
                        ))}
                        <div className="text-slate-500 text-xs mt-2">{csvPreview.rowCount} transactions found</div>
                        <button onClick={handleCSVUpload} disabled={csvUploading} className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg transition-colors">
                          {csvUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Import data"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-3 rounded-xl transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!dataSource}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Labor costs */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">Set your labor costs</h1>
                <p className="text-slate-400 text-sm">Enter the average hourly rate for each role. This is what makes shift profitability calculations accurate.</p>
              </div>

              <div className="space-y-3">
                {roles.map((r, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <input
                      type="text"
                      value={r.role}
                      onChange={(e) => setRoles(roles.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}
                      placeholder="Role name"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                    />
                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                      <span className="text-slate-500 text-sm">$</span>
                      <input
                        type="number"
                        value={r.hourlyRate}
                        onChange={(e) => setRoles(roles.map((x, j) => j === i ? { ...x, hourlyRate: parseFloat(e.target.value) || 0 } : x))}
                        className="w-16 bg-transparent text-slate-100 text-sm focus:outline-none"
                      />
                      <span className="text-slate-500 text-sm">/hr</span>
                    </div>
                    {roles.length > 1 && (
                      <button onClick={() => setRoles(roles.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400 transition-colors text-lg">×</button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={() => setRoles([...roles, { role: "", hourlyRate: 15 }])} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                + Add another role
              </button>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-3 rounded-xl transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(4)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Baseline */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">Set your labor cost target</h1>
                <p className="text-slate-400 text-sm">This is your benchmark. Strata flags any shift that exceeds it.</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-blue-400 mb-1">{Math.round(laborTarget * 100)}%</div>
                  <div className="text-slate-400 text-sm">of sales goes to labor</div>
                </div>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={Math.round(laborTarget * 100)}
                  onChange={(e) => setLaborTarget(parseInt(e.target.value) / 100)}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-2">
                  <span>10% (lean)</span>
                  <span>60% (high cost)</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
                <strong className="text-slate-300">Industry benchmarks:</strong> Restaurants 28–35% · Cafes 30–38% · Salons 35–45% · Gyms 25–32%
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-3 rounded-xl transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button onClick={() => setStep(5)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold mb-2">You&apos;re all set, {name.split(" ")[0] || "there"}!</h1>
                <p className="text-slate-400 text-sm">
                  We&apos;re crunching your last 90 days of data right now. Here&apos;s what Strata will surface for you:
                </p>
              </div>

              {/* Preview of what they'll see */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { emoji: "📊", title: "Staff performance ranking", detail: "Who drives the most repeat customers — ranked and sorted" },
                  { emoji: "🔥", title: "Shift profitability heatmap", detail: "Which days/times are bleeding labor vs. running clean" },
                  { emoji: "⚡", title: "Weekly AI digest", detail: "One email every week: top insight, biggest opportunity, quick wins" },
                  { emoji: "💰", title: "Revenue gap estimates", detail: "Dollar impact if you close your top 2 performance gaps" },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl mb-2">{item.emoji}</div>
                    <div className="text-slate-100 text-xs font-semibold mb-1">{item.title}</div>
                    <div className="text-slate-500 text-xs leading-relaxed">{item.detail}</div>
                  </div>
                ))}
              </div>

              {/* Configuration summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left">
                <div className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3">Your setup</div>
                <div className="space-y-2.5">
                  {[
                    { label: "Business", value: name },
                    { label: "Type", value: type, capitalize: true },
                    { label: "Data source", value: dataSource || "—", capitalize: true },
                    { label: "Labor target", value: `${Math.round(laborTarget * 100)}% of revenue` },
                    { label: "Roles", value: `${roles.length} role${roles.length !== 1 ? "s" : ""} · ${roles.map(r => r.role).join(", ")}` },
                  ].map(({ label, value, capitalize }) => (
                    <div key={label} className="flex justify-between text-sm gap-4">
                      <span className="text-slate-500">{label}</span>
                      <span className={cn("text-slate-100 font-medium text-right", capitalize && "capitalize")}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Processing notice */}
              <div className="flex items-start gap-3 bg-blue-600/5 border border-blue-500/20 rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0 mt-0.5" />
                <p className="text-slate-400 text-xs leading-relaxed">
                  <strong className="text-blue-300">Analysis in progress.</strong>{" "}
                  Square and Toast usually finish within 2–4 minutes. CSV is typically 30 seconds.
                  We&apos;ll send a notification to <strong className="text-slate-300">{user?.primaryEmailAddress?.emailAddress || "your email"}</strong> when your first digest is ready.
                </p>
              </div>

              <button
                onClick={complete}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors text-base"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Go to my dashboard <ArrowRight className="w-5 h-5" /></>}
              </button>
              <p className="text-center text-slate-600 text-xs">Your data is being processed in the background — the dashboard is available now.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
