import { ImageResponse } from "next/og";

/**
 * OG image — generated at request time (cached statically).
 * Editorial brand card: paper background, ink wordmark, serif italic
 * accent, mono eyebrow — matching the site's design system.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Veyra — ready-to-use business systems for client work";

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
            For consultants &amp; independent studios
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "88px",
            fontWeight: 600,
            color: "#17150f",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          Stop reinventing
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "88px",
            fontWeight: 300,
            fontStyle: "italic",
            color: "#2f4f3a",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginTop: "4px",
          }}
        >
          how you get clients.
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "30px",
            color: "#3e3a30",
            marginTop: "44px",
            maxWidth: "760px",
            lineHeight: 1.5,
          }}
        >
          Ready-to-use systems for lead management, outreach, follow-up, and
          onboarding — running the same day you download them.
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
              fontSize: "34px",
              fontWeight: 600,
              color: "#17150f",
            }}
          >
            Standard
            <span
              style={{
                fontWeight: 300,
                fontStyle: "italic",
                color: "#2f4f3a",
              }}
            >
              &nbsp;Practice
            </span>
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
            veyra.co
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
