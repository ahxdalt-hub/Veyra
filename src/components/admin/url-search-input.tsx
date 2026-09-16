"use client";

import { useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * UrlSearchInput — a debounced search box whose value lives in the URL
 * (?q=). Uncontrolled with a remount key: the input's identity follows
 * the committed URL value, so there is no state to synchronize and no
 * effect cascades. Back/forward and shared links work by construction.
 * Visual identity comes from .cc-ctl (admin.css) so every field on a
 * filter row shares one geometry.
 */
export function UrlSearchInput({
  param = "q",
  placeholder,
  className = "w-72",
}: {
  param?: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();
  const current = search.get(param) ?? "";
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(search.toString());
      if (value.trim()) params.set(param, value.trim());
      else params.delete(param);
      // Any filter change resets pagination.
      params.delete("page");
      start(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    }, 300);
  }

  return (
    <input
      key={current}
      type="search"
      defaultValue={current}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder ?? "Search"}
      style={{ opacity: pending ? 0.65 : 1 }}
      className={`cc-ctl transition-opacity ${className}`}
    />
  );
}
