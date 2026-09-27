import { NextResponse } from "next/server";
import { sendChecklistEmail } from "@/lib/email/checklist";

/**
 * POST /api/subscribe — lead magnet capture + PDF delivery.
 *
 * Validates email, stores it, then emails the 25-Point Client
 * Acquisition Audit as a PDF attachment (one email, no sequence — the
 * promise the form copy makes). Storage uses the `leads` table when
 * Supabase env vars are present (see supabase/migrations/0001.sql);
 * otherwise it logs locally so the form works end-to-end in development.
 *
 * A duplicate email (409 from the unique constraint) is still a success:
 * the person simply wants the PDF again. A failed SEND, however, is
 * reported to the client — the form promises the PDF arrives, so we
 * surface errors rather than showing a fake "check your inbox".
 *
 * Rate limiting is best-effort in-memory per runtime instance (an
 * attacker cycling IPs still hits Supabase/Resend), but it stops casual
 * double-submits and quota-burning scripts cheaply.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ------------------------------------------------------------------ */
/* Best-effort rate limit: 5 requests / 10 min / client IP            */
/* ------------------------------------------------------------------ */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 1000) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email =
    typeof body === "object" && body !== null ? (body as { email?: unknown }).email : undefined;

  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !EMAIL_RE.test(email.trim())
  ) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 422 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests — please try again in a few minutes." },
      { status: 429 }
    );
  }

  const normalized = email.trim().toLowerCase();
  const source =
    typeof body === "object" && body !== null
      ? ((body as { source?: unknown }).source ?? "homepage")
      : "homepage";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    try {
      const res = await fetch(`${url}/rest/v1/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          email: normalized,
          source: typeof source === "string" ? source.slice(0, 64) : "homepage",
        }),
      });
      if (!res.ok && res.status !== 409) {
        // 409 = duplicate via unique constraint; treat as success — they
        // are re-requesting the PDF, which we send below regardless.
        throw new Error(`Supabase insert failed: ${res.status}`);
      }
    } catch (err) {
      console.error("[subscribe] Supabase error:", err);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 502 }
      );
    }
  } else {
    // Local development fallback — no Supabase configured.
    console.log(`[subscribe] lead captured (dev): ${normalized} (${source})`);
  }

  const sent = await sendChecklistEmail(normalized);
  if (!sent.ok) {
    return NextResponse.json(
      { error: "We couldn't send the PDF just now — please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
