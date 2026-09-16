/**
 * Licensing E2E — the real HTTP activation flow against a running Veyra
 * server + the live Supabase project. Run with:
 *
 *   node supabase/test/licensing.e2e.mjs [http://localhost:3000]
 *
 * Requires: the Veyra dev/prod server up, and scripts/.sbp-token (Supabase
 * dashboard access token) for seeding/teardown SQL through the management
 * API. Seeds a throwaway paid order → entitlement → licence, then drives
 * the desktop app's exact calls: activate, replay, second device over the
 * seat limit, deactivate → free seat → new device, revalidation,
 * revocation cascade — and finally removes every seeded row. Token
 * responses are verified locally with the SAME public key the desktop app
 * embeds (WebCrypto), proving the offline path end to end.
 */

import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const REF = "otqucrqcefdychplbbtq";
// Management-API dashboard token (gitignored — scripts/.sbp-token), the same
// one scripts/sb-query.mjs uses. Never a service-role key in a test file.
const TOKEN =
  process.env.SBP_TOKEN ??
  readFileSync(new URL("../../scripts/.sbp-token", import.meta.url).pathname.slice(1), "utf8").trim();

// The desktop app's embedded public key (CGS src/lib/licensing/config.ts).
const PUBLIC_JWK = {
  kty: "EC",
  crv: "P-256",
  x: "f4HKyrMbMIxqXVwYwKnpEt39hbLVIS2sMvP7g8WIdzg",
  y: "IWqaev8f4P_3z_f1qduNDlCIeS-In0en3RNvgdFAgk0",
};

const run = async (query) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`sql ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const post = async (path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const EMAIL = "stage7-e2e@veyra.test";
const SUFFIX = Math.random().toString(16).slice(2, 6);
const uuid = (p) => `${p}${SUFFIX}-e2e0-4e00-8000-${"000000000000"}`;

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function verifyToken(token) {
  const [payload, sig] = token.split(".");
  const key = await crypto.subtle.importKey(
    "jwk",
    { ...PUBLIC_JWK, ext: false },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
  const b64 = (s) => {
    const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
    return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad), (c) =>
      c.charCodeAt(0)
    );
  };
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    b64(sig),
    new TextEncoder().encode("vls1." + payload)
  );
}
const decode = (t) =>
  JSON.parse(atob(t.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")));

async function main() {
  const order = uuid("e2e1");
  const ent = uuid("e2e2");
  const lic = uuid("e2e3");
  const seat = uuid("e2e4");
  const hex = ent.replace(/-/g, "").slice(0, 12).toUpperCase();
  const reference = `VY-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;

  // ---- seed the purchase chain (service role, like fulfillment would) ----
  await run(`insert into orders (id, email, product_slug, quantity, amount, status)
             values ('${order}', '${EMAIL}', 'client-growth-system', 1, 999900, 'paid')`);
  await run(`insert into entitlements (id, order_id, email, product_slug, seats, status)
             values ('${ent}', '${order}', '${EMAIL}', 'client-growth-system', 1, 'active')`);
  await run(`insert into licences (id, entitlement_id, email, product_slug, licence_reference, status)
             values ('${lic}', '${ent}', '${EMAIL}', 'client-growth-system', '${reference}', 'active')`);
  await run(`insert into seat_assignments (id, entitlement_id, seat_number, email, status)
             values ('${seat}', '${ent}', 1, '${EMAIL}', 'active')`);
  console.log(`seeded licence ${reference}\n`);

  const DEV1 = `E2EDeviceOne${SUFFIX.toUpperCase()}0001`;
  const DEV2 = `E2EDeviceTwo${SUFFIX.toUpperCase()}0001`;
  const DEV3 = `E2EForeign${SUFFIX.toUpperCase()}0000001`;

  try {
    // 1. valid activation
    const a1 = await post("/api/licence/activate", {
      licence_reference: reference,
      email: EMAIL,
      product_slug: "client-growth-system",
      device_id: DEV1,
      device_label: "E2E Windows",
    });
    check("valid licence activates (200, ok)", a1.status === 200 && a1.json?.ok === true, `status ${a1.status}`);
    const token1 = a1.json?.token ?? "";
    const actId = a1.json?.claims?.act ?? "";
    check("token signature verifies with the app's public key (WebCrypto)", await verifyToken(token1));
    const claims = decode(token1);
    check(
      "token carries the offline claims (product, device, seats, issuer)",
      claims.aud === "client-growth-system" && claims.dev === DEV1 && claims.seats === 1 && claims.iss === "veyra",
      JSON.stringify(claims)
    );
    check("seat usage reported", a1.json?.seats_used === 1 && a1.json?.seats === 1);

    // 2. duplicate request (idempotent) — past the 5s throttle window
    await wait(6000);
    const replay = await post("/api/licence/activate", {
      licence_reference: reference,
      email: EMAIL,
      product_slug: "client-growth-system",
      device_id: DEV1,
      device_label: "E2E Windows",
    });
    check(
      "duplicate activation replay is already_active (no double count)",
      replay.status === 200 && replay.json?.action === "already_active" && replay.json?.seats_used === 1,
      JSON.stringify({ status: replay.status, action: replay.json?.action })
    );

    // 3. seat limit — second device on a one-seat licence
    const a2 = await post("/api/licence/activate", {
      licence_reference: reference,
      email: EMAIL,
      product_slug: "client-growth-system",
      device_id: DEV2,
      device_label: "E2E macOS",
    });
    check("seat limit blocks a second device (409 seat_limit)",
      a2.status === 409 && a2.json?.code === "seat_limit", `status ${a2.status}`);
    check("seat_limit message is customer-facing",
      typeof a2.json?.message === "string" && a2.json.message.length > 20, a2.json?.message);

    // 4. invalid licence key (different throttle triple)
    const bad = await post("/api/licence/activate", {
      licence_reference: "VY-DEAD-BEEF-0000",
      email: EMAIL,
      product_slug: "client-growth-system",
      device_id: DEV2,
      device_label: "E2E",
    });
    check("invalid licence key (404 not_found)", bad.status === 404 && bad.json?.code === "not_found");

    // 5. wrong product — same triple as a2, clear the throttle first
    await wait(6000);
    const wrongProduct = await post("/api/licence/activate", {
      licence_reference: reference,
      email: EMAIL,
      product_slug: "sales-os",
      device_id: DEV2,
      device_label: "E2E",
    });
    check("wrong product refused (product_mismatch)",
      wrongProduct.json?.code === "product_mismatch", JSON.stringify(wrongProduct.json));

    // 6. email not holding a seat (different triple)
    const stranger = await post("/api/licence/activate", {
      licence_reference: reference,
      email: "stranger@veyra.test",
      product_slug: "client-growth-system",
      device_id: DEV2,
      device_label: "E2E",
    });
    check("email without a seat refused (not_seat)", stranger.json?.code === "not_seat");

    // 7. revalidation while valid
    const rev1 = await post("/api/licence/revalidate", { activation_id: actId, device_id: DEV1 });
    check("revalidate passes while the activation is real", rev1.status === 200 && rev1.json?.ok === true);
    const revWrong = await post("/api/licence/revalidate", { activation_id: actId, device_id: DEV3 });
    check("revalidate with a foreign device id fails", revWrong.json?.ok === false);

    // 8. deactivate → seat free → another device activates (throttle triple
    //    shared with step 5; wait it out)
    const deact = await post("/api/licence/deactivate", {
      licence_reference: reference,
      email: EMAIL,
      device_id: DEV1,
    });
    check("deactivation succeeds", deact.status === 200 && deact.json?.ok === true, `status ${deact.status}`);
    await wait(6000);
    const a3 = await post("/api/licence/activate", {
      licence_reference: reference,
      email: EMAIL,
      product_slug: "client-growth-system",
      device_id: DEV2,
      device_label: "E2E macOS",
    });
    check("after release, another device takes the seat", a3.status === 200 && a3.json?.ok === true);

    // 9. revocation cascade — support revokes the licence
    await run(`update licences set status='revoked' where id='${lic}'`);
    const revAfter = await post("/api/licence/revalidate", {
      activation_id: a3.json?.claims?.act ?? "",
      device_id: DEV2,
    });
    check("revalidate after revocation says licence_revoked",
      revAfter.json?.ok === false && revAfter.json?.code === "licence_revoked", JSON.stringify(revAfter.json));
    await wait(6000);
    const a4 = await post("/api/licence/activate", {
      licence_reference: reference,
      email: EMAIL,
      product_slug: "client-growth-system",
      device_id: DEV2,
      device_label: "E2E",
    });
    check("activation after revocation refused (licence_revoked)", a4.json?.code === "licence_revoked",
      JSON.stringify(a4.json));
    const revokedRows = await run(
      `select count(*)::int as n from licence_activations where licence_id='${lic}' and status='active'`
    );
    check("revocation released every device row", revokedRows?.[0]?.n === 0);

    // 10. malformed input guard (fresh triple — no throttle)
    const junk = await post("/api/licence/activate", {
      licence_reference: "x", email: "y", product_slug: "z", device_id: "short",
    });
    check("malformed request refused (400/422 invalid_input)",
      (junk.status === 400 || junk.status === 422) && junk.json?.code === "invalid_input", JSON.stringify(junk.json));

    // 11. throttle — two immediate requests, second must be 429
    await wait(6000);
    const t1 = await post("/api/licence/activate", {
      licence_reference: reference, email: EMAIL, product_slug: "client-growth-system", device_id: DEV2, device_label: "E2E",
    });
    const t2 = await post("/api/licence/activate", {
      licence_reference: reference, email: EMAIL, product_slug: "client-growth-system", device_id: DEV2, device_label: "E2E",
    });
    check("repeated requests throttled (429)", t2.status === 429, `${t1.status}/${t2.status}`);
  } finally {
    // ---- teardown: remove every seeded row (FKs cascade the rest) ----
    await run(`delete from orders where id='${order}'`).catch((e) => console.log("teardown:", e.message));
    console.log("\nteardown complete");
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("E2E crashed:", e.message);
  process.exit(2);
});
