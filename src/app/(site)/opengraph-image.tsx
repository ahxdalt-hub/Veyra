import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

/**
 * OG image — generated at request time (cached statically).
 * Editorial brand card: paper background, ink wordmark, serif italic
 * accent, mono eyebrow — matching the site's design system.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Veyra — practical business systems for client work";

/** Host shown in the card, resolved from the canonical site URL. */
const host = new URL(site.url).host;

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#fbfaf8",
          backgroundImage:
            "linear-gradient(#e6e2d9 1px, transparent 1px), linear-gradient(90deg, #e6e2d9 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              backgroundColor: "#b8842a",
            }}
          />
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "22px",
              letterSpacing: "0.16em",
              color: "#6b665a",
              textTransform: "uppercase",
            }}
          >
            For freelancers, consultants &amp; service businesses
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "64px",
            fontWeight: 600,
            color: "#17150f",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          Practical business systems
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "64px",
            fontWeight: 300,
            fontStyle: "italic",
            color: "#8a6320",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginTop: "4px",
          }}
        >
          you can actually run.
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "28px",
            color: "#3e3a30",
            marginTop: "40px",
            maxWidth: "820px",
            lineHeight: 1.5,
          }}
        >
          Structured systems for the whole client journey — positioning,
          acquisition, sales, delivery, retention, and growth.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "auto",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#b8842a",
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: "34px",
                fontWeight: 600,
                color: "#17150f",
              }}
            >
              Veyra
            </div>
          </div>
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "20px",
              letterSpacing: "0.08em",
              color: "#a19a8c",
              textTransform: "uppercase",
            }}
          >
            {host}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
