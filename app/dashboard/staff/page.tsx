"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import StaffTable from "@/components/dashboard/StaffTable";

export default function StaffPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Staff performance</h1>
      <StaffTable staff={data?.staffStats || []} />
    </div>
  );
}
