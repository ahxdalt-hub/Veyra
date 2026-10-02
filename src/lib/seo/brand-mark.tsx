import type { ReactNode } from "react";

/**
 * Veyra brand mark — the wordmark reproduced as an image.
 *
 * Veyra's identity is typographic: the header renders "Veyra" in the
 * display serif followed by a single amber dot, and the repo ships no
 * bitmap logo file. These helpers rebuild that exact mark from the design
 * tokens so it can be served as a crawlable PNG (structured data, web
 * manifest, Apple touch icon) — new artwork is not introduced and the
 * site's visual design is unchanged.
 */

/** Design tokens, mirrored from src/app/globals.css. */
const BRAND = {
  paper: "#fbfaf8",
  ink: "#17150f",
  amber: "#b8842a",
} as const;

/** Square canvas with the mark centred on the paper background. */
function frame(size: number, children: ReactNode) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: BRAND.paper,
      }}
    >
      {children}
    </div>
  );
}

/** The amber dot that trails the wordmark in the header lockup. */
function dot(size: number) {
  const d = Math.round(size * 0.09);
  return (
    <div
      style={{
        display: "flex",
        width: d,
        height: d,
        marginBottom: Math.round(size * 0.06),
        borderRadius: "50%",
        backgroundColor: BRAND.amber,
      }}
    />
  );
}

/**
 * Full wordmark ("Veyra" + dot). Used where there is room to read it —
 * Organization.logo and the web manifest icon.
 */
export function brandWordmark(size: number) {
  return frame(
    size,
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: Math.round(size * 0.04),
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: Math.round(size * 0.26),
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: BRAND.ink,
        }}
      >
        Veyra
      </div>
      {dot(size)}
    </div>
  );
}

/**
 * Monogram ("V" + dot). Used for the Apple touch icon, where iOS renders
 * the mark small enough that the full wordmark would be unreadable.
 */
export function brandMonogram(size: number) {
  return frame(
    size,
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: Math.round(size * 0.05),
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: Math.round(size * 0.46),
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: BRAND.ink,
        }}
      >
        V
      </div>
      {dot(size)}
    </div>
  );
}
