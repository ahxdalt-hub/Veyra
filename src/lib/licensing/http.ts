/**
 * HTTP plumbing shared by the licence activation routes.
 *
 * CORS: these endpoints are called by the Tauri webview (origin
 * tauri://localhost / http://tauri.localhost) and by any browser test
 * build — cross-origin by nature. They carry NO cookies and no ambient
 * credentials; the licence key + email in the JSON body are the entire
 * credential, so `Access-Control-Allow-Origin: *` is safe and required
 * (the desktop app literally cannot activate without it). Preflight is
 * answered explicitly so the content-type header is permitted.
 */

export const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

/** OPTIONS handler for every licence route. */
export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** JSON response with CORS attached. */
export function jsonCORS(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}
