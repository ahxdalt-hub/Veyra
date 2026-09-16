import { FOUNDING_LIMIT, getFoundingStatus } from "@/lib/founding";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { formatPrice } from "@/lib/site";

/**
 * FoundingBanner — the founding-release announcement marquee.
 *
 * A thin, full-width band above the header: one continuous sentence
 * travelling right → left on a seamless CSS loop (two identical halves,
 * translateX -50%). No JS animation, no countdown, no fake counters.
 *
 * Server component: the active/closed state resolves once from the real
 * paid-order count (see src/lib/founding.ts) and is cached + revalidated
 * when a sale confirms — no polling, no client fetch.
 *
 * Copy rules:
 *  - ACTIVE:  the founding offer, $149 → $79, limited to the first
 *             FOUNDING_LIMIT customers.
 *  - CLOSED:  the allocation is genuinely reached; the banner states the
 *             release is closed and shows the regular price — it never
 *             keeps selling an offer that no longer exists.
 *
 * Accessibility: the whole banner is one link to the offer's pricing
 * section (#get). The moving text is decorative for screen readers
 * (aria-hidden); the link's aria-label carries the announcement once.
 * Under prefers-reduced-motion the animation is off and the band becomes
 * horizontally scrollable, preserving all information.
 */

/** Where the banner sends visitors: the flagship's founding-offer section. */
const BANNER_HREF = "/products/client-growth-system#get";

/* Visual roles inside a moving sentence — compact mono-uppercase, the
   house `spec` register (Plex Mono ships 400/500 only, so emphasis is
   carried by colour and weight-of-500 against 400 rather than bold). */
const SENTENCE =
  "inline-flex items-center whitespace-nowrap font-mono text-[0.6875rem] uppercase leading-none tracking-[0.09em]";
const WORD = "text-ink-2";
const SEP = "mx-2.5 font-normal text-ink-4/80";
const MUTED = "text-ink-3";

/** The founding sentence: scarcity framing, anchor → price, honest limit. */
function ActiveSentence() {
  return (
    <span className={SENTENCE}>
      <span className={WORD}>Veyra Founding Release</span>
      <span className={SEP} aria-hidden="true">
        ·
      </span>
      <span className={WORD}>Client Growth System</span>
      <span className={SEP} aria-hidden="true">
        ·
      </span>
      <span className={MUTED}>
        <span className="line-through decoration-ink-4/50">
          {formatPrice(REGULAR_PRICE)}
        </span>{" "}
        Regular Value
      </span>
      <span className="mx-2.5 text-accent/70" aria-hidden="true">
        →
      </span>
      <span className="font-medium text-ink tnum">
        <span className="text-accent-deep transition-colors duration-300 group-hover:text-accent">
          {formatPrice(FOUNDING_PRICE)}
        </span>{" "}
        Founding Price
      </span>
      <span className={SEP} aria-hidden="true">
        ·
      </span>
      <span className="text-ink">
        Limited to the First{" "}
        <span className="tnum text-accent-ink">{FOUNDING_LIMIT}</span>{" "}
        Customers
      </span>
      <span className={SEP} aria-hidden="true">
        ·
      </span>
      <span className={WORD}>Founding Access Now Open</span>
      <span className={SEP} aria-hidden="true">
        ·
      </span>
    </span>
  );
}

/** The post-allocation sentence: no urgency theatre, just the facts. */
function ClosedSentence() {
  return (
    <span className={SENTENCE}>
      <span className={WORD}>Veyra Client Growth System</span>
      <span className={SEP} aria-hidden="true">
        ·
      </span>
      <span className="font-semibold text-ink">Founding Release Closed</span>
      <span className={SEP} aria-hidden="true">
        ·
      </span>
      <span className="font-medium text-ink tnum">
        Regular Price {formatPrice(REGULAR_PRICE)}
      </span>
      <span className={SEP} aria-hidden="true">
        ·
      </span>
    </span>
  );
}

/**
 * One seamless half of the marquee: the sentence repeated. The track is
 * two identical halves sliding to -50%, so each half must be at least as
 * wide as the viewport or the loop would show a gap. An active sentence
 * renders ≈1200px and a closed one ≈450px, so 4×active and 9×closed keep
 * a half past even a 4K (3840px) viewport. Both halves render identically.
 */
function MarqueeGroup({ closed }: { closed: boolean }) {
  const copies = closed ? 9 : 4;
  return (
    <>
      {Array.from({ length: copies }, (_, i) =>
        closed ? <ClosedSentence key={i} /> : <ActiveSentence key={i} />
      )}
    </>
  );
}

export async function FoundingBanner() {
  const state = await getFoundingStatus();
  const closed = state === "closed";

  const announcement = closed
    ? `Veyra Client Growth System. Founding release closed. Regular price ${formatPrice(REGULAR_PRICE)}.`
    : `Veyra founding release. Client Growth System. ${formatPrice(REGULAR_PRICE)} regular value, ${formatPrice(FOUNDING_PRICE)} founding price, limited to the first ${FOUNDING_LIMIT} customers. Founding access now open.`;

  return (
    <a
      href={BANNER_HREF}
      aria-label={announcement}
      className="group block h-9 shrink-0 overflow-hidden border-b border-line bg-accent-soft transition-colors duration-300 hover:bg-amber-soft md:h-[2.625rem]"
    >
      <div
        className="founding-marquee no-scrollbar h-full"
        aria-hidden="true"
        style={
          {
            /* ≈100px/s across the final text width: ~36s per active
               cycle, ~26s for the shorter closed sentence. */
            "--founding-marquee-duration": closed ? "26s" : "36s",
          } as React.CSSProperties
        }
      >
        <div className="founding-marquee__track h-full items-center">
          <MarqueeGroup closed={closed} />
          <MarqueeGroup closed={closed} />
        </div>
      </div>
    </a>
  );
}
