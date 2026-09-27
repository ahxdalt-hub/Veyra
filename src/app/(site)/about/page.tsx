import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHead } from "@/components/ui/section";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button, ButtonArrow } from "@/components/ui/button";
import { CheckIcon } from "@/components/ui/icons";
import {
  getAvailableProducts,
  getFeaturedProduct,
  getProducts,
  PHASE_ORDER,
} from "@/lib/products";
import { REFUND_WINDOW_LABEL, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Veyra builds practical business systems for freelancers, consultants, service businesses, and small agencies — and how each one is made.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About — Veyra", url: "/about" },
};

/* Facts resolved from the catalog at build time — the page can never
   state a number the collection doesn't back up. */
const collection = getProducts();
const available = getAvailableProducts();
const flagship = getFeaturedProduct();

const ledger = [
  { value: collection.length, label: "systems in the collection" },
  { value: available.length, label: "shipping today" },
  { value: flagship.modules.length, label: "modules in the flagship" },
  { value: PHASE_ORDER.length, label: "phases, one connected journey" },
];

const isList = [
  "A finished system you operate from day one — structures, rules, and a working rhythm for every stage.",
  "One connected journey, so the phases actually fit together instead of living in six different tools.",
  "A one-time purchase with a licence for your whole business, and future revisions included.",
  "Plain enough to run without a workshop: if a structure needs a training video, it gets simplified before it ships.",
];

const isNotList = [
  "A course to watch once and file away, or a template you fill in and forget.",
  "A framework so abstract it needs a consultant to interpret.",
  "A subscription pretending to be infrastructure you should own.",
  "A promise of results — we publish no testimonials, counts, or case studies we can't stand behind.",
];

const steps = [
  {
    n: "01",
    t: "Map the real workflow",
    d: "Start from how the work actually runs in a small business — the follow-ups that slip, the handoffs that blur — not from enterprise theory.",
  },
  {
    n: "02",
    t: "Structure it end to end",
    d: "Turn the scattered process into connected phases, each with defined inputs, outputs, and next steps, so nothing depends on memory.",
  },
  {
    n: "03",
    t: "Test for clarity",
    d: "Every structure is read cold by someone outside the build. If it needs explanation to be used, it gets simplified before it ships.",
  },
  {
    n: "04",
    t: "Ship it complete",
    d: "A system leaves only when day one is unambiguous: what to open, what to fill, what to run this week — included, not upsold.",
  },
];

const never = [
  "Publish fabricated testimonials or invented results.",
  "Sell a framework so abstract it needs a workshop to use.",
  "Pretend a subscription you don't need is infrastructure.",
  "Ship a system that isn't complete on the day you buy it.",
];

const always = [
  `Honest delivery: instant download, ${REFUND_WINDOW_LABEL}, no interrogation.`,
  "Plain language — in the product, the pricing, and these pages.",
  "One price, stated once, charged exactly as shown.",
  "Updates to what you own, included for the life of the product line.",
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
        eyebrow="About Veyra"
        title={
          <>
            We build the boring infrastructure
            <br />
            that makes client work <span className="em-serif">possible</span>.
          </>
        }
        lead="Veyra, a Caelmont brand, exists because the people who do excellent work rarely have excellent systems for getting it. We make the systems so you can stay in the work."
      />

      {/* Manifesto */}
      <div className="bg-blueprint-faint bg-paper">
        <div className="container-page py-20 lg:py-28">
          <Reveal>
            <p className="text-eyebrow">The premise</p>
            <p className="text-display-1 mt-6 max-w-4xl">
              Business processes tend to become scattered — across notes,
              documents, spreadsheets, memory, and disconnected tools. That
              works until it doesn&rsquo;t:{" "}
              <span className="em-serif text-accent-deep">
                a follow-up that never happened
              </span>
              , an onboarding that starts with chaos instead of clarity. The
              fix isn&rsquo;t more effort. It&rsquo;s a structured system for
              the work that precedes the work.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <dl className="mt-14 grid grid-cols-2 border-t border-line lg:grid-cols-4">
              {ledger.map((item) => (
                <div
                  key={item.label}
                  className="border-b border-line px-1 py-6 lg:border-b-0 lg:border-l lg:px-6 lg:first:border-l-0 lg:first:pl-0"
                >
                  <dd className="text-display-2 tnum text-ink">
                    {String(item.value).padStart(2, "0")}
                  </dd>
                  <dt className="mt-2 text-xs leading-relaxed text-ink-3">
                    {item.label}
                  </dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>

      {/* What a system is / is not */}
      <div className="border-y border-line bg-surface">
        <div className="container-page py-20 lg:py-28">
          <Reveal>
            <SectionHead
              eyebrow="Definition"
              title="What a Veyra system is — and is not."
              lead="The word 'system' gets used for courses, templates, and notion boards alike. This is the line we hold."
            />
          </Reveal>

          <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div className="border-t-2 border-accent pt-6">
                <p className="spec mb-6 text-accent-ink">It is</p>
                <ul className="space-y-5">
                  {isList.map((item) => (
                    <li key={item} className="flex gap-3">
                      <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-sm leading-relaxed text-ink-2">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="border-t-2 border-line-strong pt-6">
                <p className="spec mb-6 text-ink-4">It is not</p>
                <ul className="space-y-5">
                  {isNotList.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-ink-4"
                      >
                        —
                      </span>
                      <span className="text-sm leading-relaxed text-ink-3">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* How systems are made */}
      <div className="bg-paper">
        <div className="container-page py-20 lg:py-28">
          <Reveal>
            <SectionHead
              eyebrow="Method"
              title="How systems are made."
              lead="Four passes, every product, no exceptions. A system that fails any pass goes back a pass."
            />
          </Reveal>

          <Stagger className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <StaggerItem key={s.n} className="border-t border-line pt-6">
                <span className="spec text-accent">{s.n}</span>
                <h3 className="text-display-2 mt-3 text-[1.125rem]">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-3">
                  {s.d}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>

      {/* Commitments */}
      <div className="border-y border-line bg-accent-soft">
        <div className="container-page py-20 lg:py-28">
          <Reveal>
            <SectionHead
              eyebrow="Commitments"
              title="What we will never do. What you can always expect."
            />
          </Reveal>

          <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <p className="spec mb-6 text-accent-ink">Never</p>
              <ul className="space-y-4">
                {never.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 border-b border-accent/20 pb-4 text-sm leading-relaxed text-ink-2"
                  >
                    <span aria-hidden="true" className="text-accent">
                      —
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="spec mb-6 text-accent-ink">Always</p>
              <ul className="space-y-4">
                {always.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 border-b border-accent/20 pb-4 text-sm leading-relaxed text-ink-2"
                  >
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>

      {/* The collection */}
      <div className="bg-surface">
        <div className="container-page py-20 lg:py-28">
          <Reveal>
            <SectionHead
              eyebrow="The collection"
              title="Six systems, one operating philosophy."
              lead="Each system owns one territory of running a service business. The flagship ships today; the rest are in production and will arrive complete or not at all."
            />
          </Reveal>

          <Stagger className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {collection.map((p) => (
              <StaggerItem key={p.slug} className="bg-surface">
                <Link
                  href={`/products/${p.slug}`}
                  className="group flex h-full flex-col p-6 transition-colors hover:bg-paper lg:p-7"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`spec ${
                        p.status === "available"
                          ? "text-accent-ink"
                          : "text-ink-4"
                      }`}
                    >
                      {p.status === "available"
                        ? "Available now"
                        : "In production"}
                    </span>
                    {p.version ? (
                      <span className="spec text-ink-4">v{p.version}</span>
                    ) : null}
                  </div>
                  <h3 className="text-display-2 mt-4 text-[1.125rem] transition-colors group-hover:text-accent-deep">
                    {p.name}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-3">
                    {p.tagline}
                  </p>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>

      {/* Brand close */}
      <div className="bg-ink text-paper">
        <div className="container-page py-20 lg:py-28">
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
              <div>
                <p className="spec text-paper/50">A Caelmont brand</p>
                <h2 className="text-display-1 mt-5 max-w-2xl">
                  Stay in the work.
                  <br />
                  We&rsquo;ll keep the <span className="em-serif">system</span>.
                </h2>
                <p className="mt-6 max-w-xl text-lead text-paper/70">
                  {site.positioning} Everything on this site — the pricing, the
                  claims, the refund window — is written to be checked, not
                  just believed.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Button
                    href={`/products/${flagship.slug}`}
                    variant="accent"
                    size="lg"
                    arrow
                  >
                    Explore the flagship
                  </Button>
                  <Link
                    href="/shop"
                    className="group/btn inline-flex h-11 items-center gap-2 border-b border-paper/30 text-[0.9375rem] font-medium text-paper transition-colors hover:border-paper"
                  >
                    View the collection
                    <ButtonArrow />
                  </Link>
                </div>
              </div>
              <div className="lg:border-l lg:border-paper/15 lg:pl-12">
                <p className="spec text-paper/50">Write to us</p>
                <p className="mt-4 text-sm leading-relaxed text-paper/70">
                  Questions about a system, the licence, or whether Veyra fits
                  how you work — a real person answers.
                </p>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="mt-4 inline-block text-sm font-medium text-paper underline-offset-4 hover:underline"
                >
                  {site.contact.email}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}
