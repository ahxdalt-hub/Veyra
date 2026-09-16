/**
 * Stage 8 — customer email (Resend), with an at-most-once send ledger.
 *
 * The purchase path has THREE callers that can all finish the same order:
 * the checkout verify route, the Razorpay webhook (which retries, so the
 * same event arrives repeatedly), and the sign-in claim routine. A naive
 * "send receipt" call in each would triple-email customers. So every send
 * first consults public.email_events (0016) — unique on (order_id,
 * email_type): a row already 'sent' is final and never re-sent; a 'failed'
 * or abandoned-in-flight row is retryable. Because the three callers of
 * one order are inherently seconds/minutes apart (verify → webhook replay
 * → later sign-in), the read-then-claim sequence is safe; the unique
 * index is the hard backstop that keeps a lost race from double-sending.
 *
 * Without RESEND_API_KEY configured, emails render to the server console
 * and are recorded as sent with provider 'console' — local/dev runs keep
 * the full flow honest without needing credentials.
 *
 * Server-only: reads the service-role key and RESEND_API_KEY. Never
 * import from client components.
 */

import "server-only";
import { supabaseUrl, supabaseServiceRoleKey } from "@/lib/supabase/config";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Canonical absolute site URL — links inside customer emails. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

function fromAddress(): string {
  return process.env.VEYRA_EMAIL_FROM || "Veyra <hello@veyra.co>";
}

const emailLedgerReady = () => Boolean(supabaseUrl() && supabaseServiceRoleKey());

const ledgerHeaders = () => ({
  apikey: supabaseServiceRoleKey()!,
  Authorization: `Bearer ${supabaseServiceRoleKey()!}`,
  "Content-Type": "application/json",
});

const LEDGER_URL = () => `${supabaseUrl()}/rest/v1/email_events`;

const ledgerQuery = (orderId: string, type: string) =>
  new URLSearchParams({ order_id: `eq.${orderId}`, email_type: `eq.${type}` });

/* ------------------------------------------------------------------ */
/* Send ledger                                                         */
/* ------------------------------------------------------------------ */

/**
 * Decide whether to send, then mark the attempt in-flight. Returns false
 * when the ledger already shows the email sent (or being sent right now);
 * on true, a row in 'sending' state exists for finishSend() to settle.
 */
async function beginSend(orderId: string, type: string, toEmail: string): Promise<boolean> {
  const res = await fetch(`${LEDGER_URL()}?${ledgerQuery(orderId, type)}&select=status,updated_at`, {
    headers: ledgerHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error(`[email] ledger read failed for ${orderId}/${type}: ${res.status}`);
    return false; // stand down; a later replay retries
  }
  const rows = (await res.json()) as { status: string; updated_at: string }[];
  const existing = rows[0];

  if (existing) {
    const retryable =
      existing.status === "failed" ||
      (existing.status === "sending" &&
        Date.now() - new Date(existing.updated_at).getTime() > 15 * 60 * 1000);
    if (!retryable) return false; // 'sent' is final; fresh 'sending' = in flight
  }

  const claim = existing
    ? await fetch(`${LEDGER_URL()}?${ledgerQuery(orderId, type)}`, {
        method: "PATCH",
        headers: { ...ledgerHeaders(), Prefer: "return=minimal" },
        body: JSON.stringify({ status: "sending", error: null, to_email: toEmail, updated_at: new Date().toISOString() }),
        cache: "no-store",
      })
    : await fetch(LEDGER_URL(), {
        method: "POST",
        headers: { ...ledgerHeaders(), Prefer: "return=minimal" },
        body: JSON.stringify({ order_id: orderId, email_type: type, to_email: toEmail, status: "sending" }),
        cache: "no-store",
      });
  if (!claim.ok) {
    // A lost insert race means another caller claimed it first — stand down.
    console.error(`[email] ledger claim failed for ${orderId}/${type}: ${claim.status}`);
    return false;
  }
  return true;
}

async function finishSend(
  orderId: string,
  type: string,
  ok: boolean,
  providerId: string | null,
  error: string | null
): Promise<void> {
  const res = await fetch(`${LEDGER_URL()}?${ledgerQuery(orderId, type)}`, {
    method: "PATCH",
    headers: { ...ledgerHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({
      status: ok ? "sent" : "failed",
      provider_id: providerId,
      error,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });
  if (!res.ok) console.error(`[email] ledger finalize failed for ${orderId}/${type}`);
}

/* ------------------------------------------------------------------ */
/* Provider call — Resend REST API (no SDK dependency)                 */
/* ------------------------------------------------------------------ */

async function deliver(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<{ ok: boolean; id: string | null; error: string | null }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // Dev fallback: the whole email to the console so local runs can
    // inspect exactly what a customer would receive.
    console.log(
      `\n[email:console] TO ${to}\nSUBJECT ${subject}\n${"-".repeat(60)}\n${text}\n${"-".repeat(60)}`
    );
    return { ok: true, id: `console-${Date.now()}`, error: null };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromAddress(), to: [to], subject, html, text }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) {
      return { ok: false, id: null, error: body.message ?? `Resend HTTP ${res.status}` };
    }
    return { ok: true, id: body.id, error: null };
  } catch (err) {
    return { ok: false, id: null, error: err instanceof Error ? err.message : "network" };
  }
}

/* ------------------------------------------------------------------ */
/* Purchase receipt — the customer's buy→pay→download email            */
/* ------------------------------------------------------------------ */

export type PurchaseEmailInput = {
  toEmail: string;
  productName: string;
  orderId: string;
  seats: number;
  amountMinor: number;
  currency: string;
  licenceReference: string;
  version: string | null; // current published product version, if any
  purchasedAt: string;    // ISO
};

function money(minor: number, currency: string): string {
  const v = (minor / 100).toFixed(2).replace(/\.00$/, "");
  return currency === "USD" ? `$${v}` : `${v} ${currency}`;
}

function shortRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/**
 * Send the purchase/licence email for an order — at most once per
 * (order, 'purchase_receipt'). Never throws: a broken email must not
 * fail a verified payment; the ledger records failure and a later webhook
 * replay or sign-in claim retries it.
 */
export async function sendPurchaseEmail(input: PurchaseEmailInput): Promise<void> {
  const { orderId, toEmail } = input;
  if (!emailLedgerReady()) return;
  try {
    if (!(await beginSend(orderId, "purchase_receipt", toEmail))) return;

    const accountUrl = `${siteUrl()}/account`;
    const libraryUrl = `${siteUrl()}/account/library`;
    const date = new Date(input.purchasedAt).toDateString();
    const orderRef = shortRef(orderId);

    const subject = `${input.productName} — your licence ${input.licenceReference}`;
    const text = [
      `Thank you for your purchase of ${input.productName}.`,
      ``,
      `Order:      ${orderRef} (${date})`,
      `Total:      ${money(input.amountMinor, input.currency)}`,
      `Seats:      ${input.seats}`,
      `Licence:    ${input.licenceReference}`,
      input.version ? `Version:    ${input.version}` : null,
      ``,
      `Get started:`,
      `1. Sign in to your Veyra account: ${accountUrl}`,
      `2. Open your library and download the Windows installer: ${libraryUrl}`,
      `3. Run the installer, then activate with your licence key above.`,
      ``,
      `Activations can be managed (and moved between machines) from`,
      `Account → Licences. Everything you buy includes all future`,
      `versions — always download the latest from your account.`,
      ``,
      `Questions? Just reply to this email.`,
      ``,
      `— Veyra`,
    ]
      .filter((l): l is string => l !== null)
      .join("\n");

    const html = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#17150f;line-height:1.6">
  <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a8474">Veyra · Receipt &amp; licence</p>
  <h1 style="font-size:26px;margin:6px 0 14px">Thank you — ${escapeHtml(input.productName)} is yours.</h1>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 18px">
    <tr><td style="padding:7px 0;color:#6f6a5d;border-bottom:1px solid #e7e4da">Order</td><td align="right" style="padding:7px 0;border-bottom:1px solid #e7e4da"><b>${escapeHtml(orderRef)}</b> · ${escapeHtml(date)}</td></tr>
    <tr><td style="padding:7px 0;color:#6f6a5d;border-bottom:1px solid #e7e4da">Total paid</td><td align="right" style="padding:7px 0;border-bottom:1px solid #e7e4da">${escapeHtml(money(input.amountMinor, input.currency))}</td></tr>
    <tr><td style="padding:7px 0;color:#6f6a5d;border-bottom:1px solid #e7e4da">Seats</td><td align="right" style="padding:7px 0;border-bottom:1px solid #e7e4da">${input.seats}</td></tr>
    ${input.version ? `<tr><td style="padding:7px 0;color:#6f6a5d;border-bottom:1px solid #e7e4da">Version</td><td align="right" style="padding:7px 0;border-bottom:1px solid #e7e4da">${escapeHtml(input.version)}</td></tr>` : ""}
  </table>
  <div style="background:#f4f2ec;border:1px solid #e7e4da;border-radius:8px;padding:16px;margin:0 0 22px;text-align:center">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a8474">Your licence key</div>
    <div style="font-family:'Courier New',monospace;font-size:20px;font-weight:bold;letter-spacing:.06em;margin-top:6px">${escapeHtml(input.licenceReference)}</div>
  </div>
  <h2 style="font-size:16px;margin:0 0 10px">Install in three steps</h2>
  <ol style="font-size:14px;padding-left:20px;margin:0 0 22px">
    <li style="margin-bottom:6px">Sign in to your <a href="${escapeHtml(accountUrl)}" style="color:#2f5d3a">Veyra account</a> — your purchase and licence are already there.</li>
    <li style="margin-bottom:6px">Open the <a href="${escapeHtml(libraryUrl)}" style="color:#2f5d3a">Delivery Center</a> and download the Windows installer.</li>
    <li>Run the installer and activate with the licence key above.</li>
  </ol>
  <p style="font-size:13px;color:#6f6a5d">Activations are managed from <a href="${escapeHtml(accountUrl)}/licences" style="color:#2f5d3a">Account → Licences</a> — a seat can move between machines anytime. Every future version is included.</p>
  <p style="font-size:13px;color:#6f6a5d;margin-top:18px">Questions? Just reply to this email.</p>
  <p style="font-size:13px;color:#8a8474;margin-top:14px">— Veyra</p>
</div>`;

    const result = await deliver(toEmail, subject, html, text);
    await finishSend(orderId, "purchase_receipt", result.ok, result.id, result.error);
    if (!result.ok) {
      console.error(`[email] purchase send failed for ${orderId}: ${result.error}`);
    }
  } catch (err) {
    console.error(`[email] purchase send error for ${orderId}:`, err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
