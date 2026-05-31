import { Skeleton } from "@/components/ui/skeleton";

function MetricCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function StaffRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-800 last:border-0">
      <Skeleton className="w-7 h-7 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-6 w-14 rounded-full" />
      <Skeleton className="h-3.5 w-16" />
    </div>
  );
}

function HeatmapRow() {
  return (
    <div className="flex gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="flex-1 h-10 rounded-lg" />
      ))}
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metric cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard />
        <MetricCard />
        <MetricCard />
        <MetricCard />
      </div>

      {/* Week summary + digest row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-7 w-18" />
              <Skeleton className="h-3 w-22" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Staff table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <StaffRow key={i} />
        ))}
      </div>

      {/* Shift heatmap */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <HeatmapRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
