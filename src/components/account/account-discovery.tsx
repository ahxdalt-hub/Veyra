"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  getProducts,
  phaseMeta,
  type Product,
} from "@/lib/products";
import { formatPrice } from "@/lib/site";
import { ArrowRightIcon, CloseIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

/**
 * Discovery — the real Veyra catalog, filtered by what the customer
 * already owns. Clicking a system opens a quick-view dialog instead of
 * navigating away: the dialog grows out of the clicked card, and closes
 * back into it.
 *
 * The dialog mounts through a portal (an ancestor carries an entrance
 * transform, which would otherwise trap position:fixed). On mount it
 * measures itself against the captured card rect, sets its transform
 * origin to the card's center, then springs open from that point; close
 * reverses into the same point before unmount. Escape, backdrop click,
 * focus placement, and body scroll locking are handled here.
 */
export function AccountDiscovery({
  ownedSlugs,
  heading = "Complete your Veyra system",
  intro = "Veyra systems are designed to connect — each one deepens a phase of the client-growth journey.",
}: {
  ownedSlugs: string[];
  heading?: string;
  intro?: string;
}) {
  const owned = new Set(ownedSlugs);
  const suggestions = getProducts().filter((p) => !owned.has(p.slug));

  type Active = {
    slug: string;
    origin: { cx: number; cy: number; w: number; h: number };
  };
  const [active, setActive] = useState<Active | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeMode, setCloseMode] = useState<"shrink" | "evaporate">("shrink");

  const open = useCallback(
    (slug: string, e: React.MouseEvent<HTMLButtonElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setActive({
        slug,
        origin: {
          cx: r.left + r.width / 2,
          cy: r.top + r.height / 2,
          w: r.width,
          h: r.height,
        },
      });
      setClosing(false);
    },
    []
  );

  const close = useCallback(
    (mode: "shrink" | "evaporate" = "shrink") => {
      setCloseMode(mode);
      setClosing(true);
      // Unmount after the exit animation lands (evaporate is slower).
      window.setTimeout(
        () => {
          setActive(null);
          setClosing(false);
          setCloseMode("shrink");
        },
        mode === "evaporate" ? 560 : 240
      );
    },
    []
  );

  // Escape closes; body scroll stays locked while the dialog is up.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closing) close();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [active, closing, close]);

  if (suggestions.length === 0) return null;

  const activeProduct = active
    ? (suggestions.find((p) => p.slug === active.slug) ?? null)
    : null;

  return (
    <section aria-labelledby="account-discovery">
      <h2 id="account-discovery" className="text-eyebrow">
        {heading}
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-3">
        {intro}
      </p>

      <ul role="list" className="stagger-rise mt-4 space-y-3">
        {suggestions.map((product) => {
          const available = product.status === "available" && product.price !== null;
          return (
            <li key={product.slug}>
              <button
                type="button"
                onClick={(e) => open(product.slug, e)}
                className="group block w-full rounded-md border border-line bg-paper p-5 text-left transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-ink/25 hover:shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-line bg-surface font-display text-base italic text-accent-ink"
                  >
                    {product.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2.5 text-sm font-medium text-ink">
                      {product.name}
                      {available ? (
                        <span className="tnum text-xs font-normal text-ink-3">
                          {formatPrice(product.price!)}
                        </span>
                      ) : (
                        <span className="rounded-xs border border-line-strong bg-surface px-2 py-0.5 text-xs font-normal text-ink-3">
                          Coming soon
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink-3">
                      {product.cardDescription}
                    </p>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-ink-4 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-ink-4">
        Coming-soon systems are in development — they can&rsquo;t be purchased
        yet.
      </p>

      {typeof document !== "undefined" && activeProduct && active
        ? createPortal(
            <ProductQuickView
              product={activeProduct}
              origin={active.origin}
              closing={closing}
              closeMode={closeMode}
              onClose={close}
            />,
            document.body
          )
        : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Product quick-view — a dialog carrying the product page's core
 * information. Sized to the viewport (max 64rem wide, max 84dvh tall,
 * scrollable body) so it fits comfortably on any screen.
 */
function ProductQuickView({
  product,
  origin,
  closing,
  closeMode,
  onClose,
}: {
  product: Product;
  origin: { cx: number; cy: number; w: number; h: number };
  closing: boolean;
  closeMode: "shrink" | "evaporate";
  onClose: (mode?: "shrink" | "evaporate") => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // FLIP: the panel's first paint is transformed to exactly overlap the
  // clicked card (translated to its center, scaled to its size), then it
  // transitions to identity — one continuous glide, no jump.
  const [entered, setEntered] = useState(false);
  const [from, setFrom] = useState<{ tx: number; ty: number; sx: number; sy: number } | null>(
    null
  );

  const visible = entered && !closing;
  const evaporate = closing && closeMode === "evaporate";

  // Measure before first paint (useLayoutEffect) so the starting frame
  // already sits on the card — nothing flashes at screen center.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel) {
      const pr = panel.getBoundingClientRect();
      const pcx = pr.left + pr.width / 2;
      const pcy = pr.top + pr.height / 2;
      setFrom({
        tx: origin.cx - pcx,
        ty: origin.cy - pcy,
        sx: Math.max(0.05, Math.min(1, origin.w / pr.width)),
        sy: Math.max(0.08, Math.min(1, origin.h / pr.height)),
      });
    }
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setEntered(true))
    );
    return () => cancelAnimationFrame(raf);
    // Mount-only: origin is fixed for this dialog instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Place focus on the dialog itself; restore it on unmount.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const available = product.status === "available" && product.price !== null;
  const modulePhases = [...new Set(product.modules.map((m) => m.phase))];

  return createPortal(
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible
          ? "opacity-100"
          : evaporate
            ? "opacity-0 duration-[540ms]"
            : "opacity-0 duration-[220ms] ease-[cubic-bezier(0.4,0,1,1)]"
      }`}
    >
      {/* Backdrop — click to dismiss (shrinks back into the card) */}
      <div
        aria-hidden="true"
        onClick={() => onClose()}
        className="absolute inset-0 bg-ink/45"
      />

      {/* Panel — grows out of the clicked card; ✕ lets it evaporate */}
      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center p-3 sm:items-center sm:p-6"
        aria-hidden="true"
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quickview-title"
          tabIndex={-1}
          className={`pointer-events-auto flex max-h-[84dvh] w-[min(100%-1rem,64rem)] flex-col overflow-hidden rounded-lg border border-line bg-paper shadow-lg outline-none transition-[opacity,transform,filter] ${
            visible
              ? "opacity-100 duration-[460ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              : evaporate
                ? "opacity-0 duration-[540ms] ease-[cubic-bezier(0.33,1,0.68,1)]"
                : "opacity-0 duration-[220ms] ease-[cubic-bezier(0.4,0,1,1)]"
          }`}
          style={{
            transform: visible
              ? "translate(0px, 0px) scale(1, 1)"
              : evaporate
                ? "translate(0px, -28px) scale(1.04, 1.04)"
                : `translate(${(from?.tx ?? 0).toFixed(1)}px, ${(from?.ty ?? 0).toFixed(1)}px) scale(${(from?.sx ?? 0.1).toFixed(3)}, ${(from?.sy ?? 0.1).toFixed(3)})`,
            filter: evaporate ? "blur(18px)" : "blur(0px)",
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-4 border-b border-line bg-paper p-5 sm:p-7">
            <span
              aria-hidden="true"
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-accent/25 bg-accent-soft font-display text-lg italic text-accent-ink ${
                visible ? "animate-pop" : ""
              }`}
            >
              {product.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <h3
                id="quickview-title"
                className="text-display-2 text-xl sm:text-2xl"
              >
                {product.name}
              </h3>
              <p className="mt-0.5 text-sm leading-snug text-ink-3">
                {product.tagline}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-2.5">
                {available ? (
                  <span className="tnum text-sm font-medium text-ink">
                    {formatPrice(product.price!)}
                  </span>
                ) : (
                  <span className="rounded-xs border border-line-strong bg-surface px-2 py-0.5 text-xs font-normal text-ink-3">
                    Coming soon
                  </span>
                )}
                {product.version ? (
                  <span className="spec text-ink-4">
                    Version {product.version}
                  </span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onClose("evaporate")}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-line bg-surface text-ink-3 transition-all duration-200 hover:border-ink/25 hover:rotate-90 hover:text-ink active:scale-95"
            >
              <CloseIcon aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body — the product page's story, in a wide two-column read */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
            <div
              className={`stagger-rise grid gap-8 text-sm leading-relaxed text-ink-2 lg:grid-cols-2 lg:gap-12 ${
                visible ? "" : "opacity-0"
              }`}
            >
              <div className="space-y-6">
                <section>
                  <h4 className="text-eyebrow mb-2">What it is</h4>
                  <p>{product.description}</p>
                </section>

                <section>
                  <h4 className="text-eyebrow mb-2">Who it&rsquo;s for</h4>
                  <p>{product.audience}</p>
                </section>

                <section className="rounded-md border border-accent/25 bg-accent-soft p-4">
                  <h4 className="text-eyebrow mb-1.5 text-accent-ink">
                    The outcome
                  </h4>
                  <p className="text-ink-2">{product.outcome}</p>
                </section>

                {product.specs.length > 0 ? (
                  <section>
                    <h4 className="text-eyebrow mb-2">The details</h4>
                    <dl className="divide-y divide-line rounded-md border border-line bg-surface px-4">
                      {product.specs.map((spec) => (
                        <div
                          key={spec.label}
                          className="flex items-baseline justify-between gap-4 py-2.5"
                        >
                          <dt className="spec shrink-0 text-ink-4">
                            {spec.label}
                          </dt>
                          <dd className="text-right text-xs font-medium text-ink-2">
                            {spec.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}
              </div>

              {product.modules.length > 0 ? (
                <section>
                  <h4 className="text-eyebrow mb-3">
                    What&rsquo;s inside — {product.modules.length} modules
                  </h4>
                  <div className="space-y-4">
                    {modulePhases.map((phase) => (
                      <div key={phase}>
                        <p className="spec mb-2 text-accent">
                          {phaseMeta[phase].label}
                        </p>
                        <ul role="list" className="space-y-2.5">
                          {product.modules
                            .filter((m) => m.phase === phase)
                            .map((module) => (
                              <li
                                key={module.name}
                                className="rounded-md border border-line bg-surface px-4 py-3 transition-colors duration-200 hover:border-ink/20"
                              >
                                <p className="text-sm font-medium text-ink">
                                  {module.name}
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
                                  {module.purpose}
                                </p>
                              </li>
                            ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>

          {/* Footer action */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper p-5 sm:p-7">
            {available ? (
              <>
                <Button href={`/products/${product.slug}`} variant="accent" size="md" arrow>
                  Get it — {formatPrice(product.price!)}
                </Button>
                <Link
                  href={`/products/${product.slug}`}
                  className="group inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 underline-offset-4 hover:text-ink hover:underline"
                >
                  Full product page
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </>
            ) : (
              <>
                <p className="text-xs leading-relaxed text-ink-3">
                  In development — not purchasable yet.
                </p>
                <Link
                  href={`/products/${product.slug}`}
                  className="group inline-flex items-center gap-1.5 text-xs font-medium text-accent underline-offset-4 hover:underline"
                >
                  Read the full page
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
