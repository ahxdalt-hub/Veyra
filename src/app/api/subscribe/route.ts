import { NextResponse } from "next/server";

/**
 * POST /api/subscribe — lead magnet capture.
 *
 * Validates email, then stores it. When Supabase env vars are present
 * it inserts into the `leads` table (see supabase/migrations/0001.sql);
 * otherwise it logs locally so the form works end-to-end in development
 * and Phase 2 only needs env vars — zero code changes.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
        // 409 = duplicate via unique constraint; treat as success for UX.
        throw new Error(`Supabase insert failed: ${res.status}`);
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("[subscribe] Supabase error:", err);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 502 }
      );
    }
  }

  // Local development fallback — no Supabase configured.
  console.log(`[subscribe] lead captured (dev): ${normalized} (${source})`);
  return NextResponse.json({ ok: true, dev: true });
}
