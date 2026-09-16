import Link from "next/link";

/**
 * Pager — URL-preserving pagination links for any admin list. Filters
 * ride along; only the page token changes.
 */
export function Pager({
  page,
  pages,
  basePath,
  filters,
}: {
  page: number;
  pages: number;
  basePath: string;
  filters: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const href = (next: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
    if (next > 1) params.set("page", String(next));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <div
      className="flex items-center justify-between border-t px-4 py-3 text-xs"
      style={{ borderColor: "var(--cc-line)", color: "var(--cc-text-3)" }}
    >
      <span className="tnum">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className="inline-flex h-7 items-center rounded-sm border px-2.5 transition-colors hover:bg-[var(--cc-surface-2)]"
            style={{ borderColor: "var(--cc-line-strong)" }}
          >
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link
            href={href(page + 1)}
            className="inline-flex h-7 items-center rounded-sm border px-2.5 transition-colors hover:bg-[var(--cc-surface-2)]"
            style={{ borderColor: "var(--cc-line-strong)" }}
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
