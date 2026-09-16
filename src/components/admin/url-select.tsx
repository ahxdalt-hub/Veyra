"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * UrlSelect — a filter select whose value lives in the URL. Remounts on
 * external change via key, so it stays controlled by the URL alone.
 */
export function UrlSelect({
  param,
  options,
  label,
}: {
  param: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();
  const current = search.get(param) ?? options[0]?.value ?? "";

  return (
    <select
      key={`${param}:${current}`}
      aria-label={label}
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const params = new URLSearchParams(search.toString());
        if (e.target.value && e.target.value !== options[0]?.value)
          params.set(param, e.target.value);
        else params.delete(param);
        params.delete("page");
        start(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
      }}
      className="cc-ctl"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
