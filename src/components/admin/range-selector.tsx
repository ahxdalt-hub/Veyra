"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Segmented } from "@/components/admin/admin-ui";

/**
 * RangeSelector — time-range control that drives server-side queries
 * through the URL (?range=...). Every admin page that supports ranges
 * reads it from searchParams, so links, back-button, and refresh all
 * behave.
 */

const OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

export function RangeSelector({ param = "range", fallback = "30d" }: { param?: string; fallback?: string } = {}) {
  const router = useRouter();
  const search = useSearchParams();
  const [pending, start] = useTransition();
  const value = search.get(param) ?? fallback;

  return (
    <div style={{ opacity: pending ? 0.6 : 1, transition: "opacity 0.15s" }}>
      <Segmented
        options={OPTIONS}
        value={OPTIONS.some((o) => o.value === value) ? value : fallback}
        onChange={(v) => {
          const next = new URLSearchParams(search.toString());
          next.set(param, v);
          start(() => router.replace(`?${next.toString()}`, { scroll: false }));
        }}
      />
    </div>
  );
}
