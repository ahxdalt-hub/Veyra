import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  listRedeemCodes,
  redeemCodeStats,
  redeemCodeBatches,
} from "@/lib/admin/data";
import { dateTime, timeAgo } from "@/components/admin/format";
import { ScrollFadeX } from "@/components/admin/smooth-scroll";
import {
  Panel,
  PageHeading,
  EmptyState,
  StatusPill,
} from "@/components/admin/admin-ui";
import { UrlSearchInput } from "@/components/admin/url-search-input";
import { UrlSelect } from "@/components/admin/url-select";
import { Pager } from "@/components/admin/pager";
import { RedeemCodeAction } from "@/components/admin/redeem-code-action";

export const metadata: Metadata = { title: "Redeem codes" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

/**
 * Redeem codes — marketplace licence keys (AppSumo), kept deliberately apart
 * from Coupons. A coupon is a discount applied at our checkout; a code here
 * represents money the buyer already paid someone else, and claiming it mints
 * a full-price paid order. So it gets its own table, its own screen, and its
 * own claimed / unclaimed ledger.
 *
 * The batch is 10,001 rows, so every read here is paginated and counted in
 * the database. Nothing on this page ever fetches the whole table.
 */

type Sp = { q?: string; status?: string; batch?: string; page?: string };

const STATUSES = ["available", "redeemed", "deactivated"] as const;

function money(cents: number, currency: string): string {
  return `${currency === "USD" ? "$" : ""}${(cents / 100).toFixed(0)}${
    currency === "USD" ? "" : ` ${currency}`
  }`;
}

/** The ledger words, since this table's whole job is claimed vs unclaimed. */
const WORD: Record<string, string> = {
  available: "Unclaimed",
  redeemed: "Claimed",
  deactivated: "Pulled",
};

export default async function RedeemCodesPage({
  searchParams,
}: {
  searchParams: Promise<Sp>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number])
    ? (sp.status as (typeof STATUSES)[number])
    : undefined;

  const [result, stats, batches] = await Promise.all([
    listRedeemCodes({
      search: sp.q?.trim() || undefined,
      status,
      batch: sp.batch?.trim() || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    redeemCodeStats(),
    redeemCodeBatches(),
  ]);

  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeading
        title="Redeem codes"
        meta={
          result
            ? stats
              ? `${stats.total.toLocaleString()} issued · ${stats.redeemed.toLocaleString()} claimed · ${stats.available.toLocaleString()} unclaimed`
              : `${total.toLocaleString()} matching`
            : "Database not connected"
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <UrlSearchInput placeholder="Search code, email or batch…" className="w-72" />
        <UrlSelect
          param="status"
          label="Filter by status"
          options={[
            { value: "", label: "All statuses" },
            { value: "available", label: "Unclaimed" },
            { value: "redeemed", label: "Claimed" },
            { value: "deactivated", label: "Pulled from sale" },
          ]}
        />
        {batches.length > 1 ? (
          <UrlSelect
            param="batch"
            label="Filter by batch"
            options={[
              { value: "", label: "All batches" },
              ...batches.map((b) => ({ value: b, label: b })),
            ]}
          />
        ) : null}
      </div>

      <div className="mt-4">
        <Panel padded={false}>
          {!result ? (
            <EmptyState
              title="Database not connected"
              body="Add your Supabase credentials to see redemption codes."
            />
          ) : result.rows.length === 0 ? (
            <EmptyState
              title={total === 0 ? "No redeem codes yet" : "No codes match"}
              body={
                total === 0
                  ? "Generate a batch with scripts/appsumo-codes.mjs — codes land here, not in Coupons."
                  : "Try clearing the filters above."
              }
            />
          ) : (
            <>
              <ScrollFadeX maxY={520}>
                <table className="cc-table min-w-full">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Value</th>
                      <th>Batch</th>
                      <th>Claimed by</th>
                      <th>Claimed</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((c) => (
                      <tr key={c.code}>
                        <td className="font-mono text-xs" style={{ color: "var(--cc-text)" }}>
                          {c.code.toUpperCase()}
                        </td>
                        <td>
                          <StatusPill status={WORD[c.status] ?? c.status} />
                        </td>
                        <td className="tnum whitespace-nowrap" style={{ color: "var(--cc-text-2)" }}>
                          {money(c.value_cents, c.currency)}
                          <span className="block text-xs" style={{ color: "var(--cc-text-4)" }}>
                            {c.channel}
                          </span>
                        </td>
                        <td className="max-w-[180px] truncate text-xs" style={{ color: "var(--cc-text-4)" }}>
                          {c.batch}
                        </td>
                        <td className="max-w-[220px] truncate" style={{ color: "var(--cc-text)" }}>
                          {c.redeemed_email ? (
                            c.redeemed_order_id ? (
                              <Link
                                href={`/admin/orders?focus=${c.redeemed_order_id}`}
                                className="hover:underline"
                                title={c.redeemed_email}
                              >
                                {c.redeemed_email}
                              </Link>
                            ) : (
                              c.redeemed_email
                            )
                          ) : (
                            <span style={{ color: "var(--cc-text-4)" }}>—</span>
                          )}
                        </td>
                        <td
                          className="whitespace-nowrap text-xs"
                          style={{ color: "var(--cc-text-4)" }}
                          title={c.redeemed_at ? dateTime(c.redeemed_at) : undefined}
                        >
                          {c.redeemed_at ? timeAgo(c.redeemed_at) : "—"}
                        </td>
                        <td className="text-right">
                          <RedeemCodeAction code={c.code} status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollFadeX>
              <Pager
                page={page}
                pages={pages}
                basePath="/admin/redeem-codes"
                filters={{ q: sp.q, status: sp.status, batch: sp.batch }}
              />
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
