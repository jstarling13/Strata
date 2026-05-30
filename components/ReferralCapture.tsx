"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Silently captures the ?ref=<orgId> query param from the URL and stores it
 * in localStorage so the onboarding flow can link the referral to the new org.
 * Drop this in any auth page layout — it renders nothing.
 */
export default function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && ref.length > 0) {
      try {
        localStorage.setItem("strata_referral", ref);
      } catch {}
    }
  }, [searchParams]);

  return null;
}
