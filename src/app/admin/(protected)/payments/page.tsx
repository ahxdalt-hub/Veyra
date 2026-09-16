import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { listOrders, type RangeKey, rangeBounds } from "@/lib/admin/data";
import { money, dateTime, dateShort, timeAgo, shortId } from "@/components/admin/format";
import { ScrollFadeX } from "@/components/admin/smooth-scroll";import { Panel, PageHeading, EmptyState, StatusPill } from "@/components/admin/admin-ui";
import { UrlSearchInput } from "@/components/admin/url-search-input";
import { UrlSelect } from "@/components/admin/url-select";
import { Pager } from "@/components/admin/pager";
import { RangeSelector } from "@/components/admin/range-selector";
import type { OrderRow } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

/**
 * Payments — the Razorpay view of the same ledger: one row per payment
 * attempt, filterable by outcome and window. Payments ARE orders in this
 * architecture (orders.razorpay_payment_id is the provider reference),
 * so this view reads real payment data without duplicating anything.
 * No card data exists in our schema at all — nothing sensitive can leak.
 */

const PAGE_SIZE = 25;
const RANGES: RangeKey[] = ["today", "7d", "30d", "90d", "year", "all"];

type Sp = { q?: string; result?: string; range?: string; page?: string };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Sp>;
}) {
  if (!(await requireAdmin())) redirect("/admin/sign-in");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const range = RANGES.includes(sp.range as RangeKey) ? (sp.range as RangeKey) : "30d";
  const { from, to } = rangeBounds(range);

  const result = sp.result === "all" ? undefined : sp.result;
  const orders = await listOrders({
    search: sp.q?.trim() || undefined,
    status: (result as OrderRow["status"]) || undefined,
    from,
    to,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const total = orders?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Summary across the window (cheap aggregates via the list totals is
  // not enough — use the metrics RPC for volume, this page's own query
  // is the filtered detail).
  return (
    <div>
      <PageHeading
        title="Payments"
        meta="Every payment attempt, by outcome"
        actions={<RangeSelector />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <UrlSearchInput placeholder="Search by payer email…" className="w-64" />
        <UrlSelect
          param="result"
          label="Filter by outcome"
          options={[
            { value: "", label: "All outcomes" },
            { value: "paid", label: "Successful" },
            { value: "pending", label: "Pending" },
            { value: "failed", label: "Failed" },
            { value: "refunded", label: "Refunded" },
          ]}
        />
      </div>

      <div className="mt-4">
        <Panel padded={false}>
          {!orders ? (
            <EmptyState title="Database not connected" body="Add your Supabase credentials to see real payments." />
          ) : orders.rows.length === 0 ? (
            <EmptyState
              title="No payments in this window"
              body="Successful and failed payment attempts appear here as they happen."
            />
          ) : (
            <>
              <ScrollFadeX>
                <table className="cc-table min-w-full">
                  <thead>
                    <tr>
                      <th>Payment</th>
                      <th>Order</th>
                      <th>Payer</th>
                      <th className="text-right">Amount</th>
                      <th>Provider</th>
                      <th>Outcome</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.rows.map((o) => (
                      <tr key={o.id}>
                        <td>
                          {o.razorpay_payment_id ? (
                            <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs hover:underline" style={{ color: "var(--cc-accent-ink)" }}>
                              {o.razorpay_payment_id}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs" style={{ color: "var(--cc-text-4)" }}>—</span>
                          )}
                        </td>
                        <td>
                          <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs hover:underline" style={{ color: "var(--cc-text-3)" }}>
                            {shortId(o.id)}
                          </Link>
                        </td>
                        <td className="max-w-[200px] truncate" style={{ color: "var(--cc-text)" }}>{o.email}</td>
                        <td className="text-right font-medium tnum" style={{ color: "var(--cc-text)" }}>
                          {money(o.amount, o.currency)}
                        </td>
                        <td style={{ color: "var(--cc-text-3)" }}>Razorpay</td>
                        <td><StatusPill status={o.status} /></td>
                        <td className="whitespace-nowrap" title={dateTime(o.created_at)} style={{ color: "var(--cc-text-4)" }}>
                          {range === "today" ? timeAgo(o.created_at) : dateShort(o.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollFadeX>
              <Pager page={page} pages={pages} basePath="/admin/payments" filters={{ q: sp.q, result: sp.result, range: sp.range }} />
            </>
          )}
        </Panel>
      </div>

      <p className="mt-3 text-xs" style={{ color: "var(--cc-text-4)" }}>
        Card details are never stored or displayed by design — Razorpay
        holds the instrument; we hold the outcome. Refunds are issued in
        the Razorpay dashboard; this view confirms them when the webhook
        reports.
      </p>
    </div>
  );
}
