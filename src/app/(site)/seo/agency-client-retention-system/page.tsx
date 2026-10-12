import type { Metadata } from "next";
import Link from "next/link";
import { site, formatPrice, REFUND_WINDOW_LABEL } from "@/lib/site";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Agency Client Retention System | A Structured Framework for Keeping Clients",
  description: "A structured framework for retaining clients longer, increasing lifetime value, and turning one-time projects into recurring revenue streams.",
  alternates: { canonical: `${site.url}/seo/agency-client-retention-system` },
};

export default function AgencyClientRetention() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-paper">
        <div className="container-page py-16 sm:py-24 lg:py-32 text-center">
          <h1 className="text-display-hero mx-auto max-w-4xl">
            An Agency Client Retention System You Can Put To Work
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop losing clients after delivery. Build systems that keep them engaged, 
            turn satisfaction into referrals, and transform project work into predictable 
            recurring contracts.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3">
            <Link href="/products/client-growth-system">
              <Button variant="accent" size="lg">
                Get the Client Growth System
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tnum">{formatPrice(FOUNDING_PRICE)}</span> one-time{" "}
              <span className="line-through tnum">{formatPrice(REGULAR_PRICE)}</span> · {REFUND_WINDOW_LABEL}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-24">
        <div className="container-page max-w-4xl">
          <h2 className="text-3xl font-medium mb-6">Why Agencies Bleed Clients</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium mb-3">The Delivery Cliff</h3>
              <p className="text-muted">
                You nail the delivery, client's happy… then silence. Why? Because you stopped 
                engaging the moment you hit send on the final deliverable. Without a retention 
                system, every finished project is another opportunity lost.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">No Upsell Triggers Identified</h3>
              <p className="text-muted">
                Client says "we love what you did" but you don't have a process to capture 
                that momentum. They mention "maybe next quarter we could…" — and you miss 
                it because you're already moving to the next fire drill.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Reactive vs Proactive Relationships</h3>
              <p className="text-muted">
                You only reach out when something breaks or they ask for something new. 
                That makes you order-takers instead of strategic partners. The best agencies 
                schedule check-ins before clients even need them.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Lifetime Value Misunderstood</h3>
              <p className="text-muted">
                One $5k project feels great until you realize that same client spends $50k 
                over two years if you stay engaged. Retention isn't about squeezing more 
                from unhappy clients — it's about staying relevant long enough for the 
                numbers to compound.
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <h2 className="text-3xl font-medium mb-6">How This System Solves It</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Automatic Check-In Schedule</h3>
              <p className="text-muted">
                Set it once: 30-day satisfaction survey, 90-day review meeting, quarterly 
                business review. The system sends reminders so you never forget to touch base.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Success Milestone Tracking</h3>
              <p className="text-muted">
                Log their wins, revenue growth, team expansions, awards. Every milestone is 
                an opening to celebrate with them and suggest how to build on it.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Upsell Trigger Alerts</h3>
              <p className="text-muted">
                When a client hits certain signals (new hire announcement, funding round, 
                office move), get notified. Then proactively offer services that match their 
                new stage.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Referral Request Workflows</h3>
              <p className="text-muted">
                After every successful milestone, prompt the right question at the right time. 
                Happy clients who've seen results are ready to refer — they just need you 
                to ask systematically.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg md:col-span-2">
              <h3 className="text-xl font-medium mb-3">✓ Renewal Forecast Dashboard</h3>
              <p className="text-muted">
                See which contracts expire in 30/60/90 days, who needs renewals pushed forward, 
                and projected revenue by client. Plan your outreach calendar weeks ahead.
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <div className="bg-blueprint-faint p-8 rounded-lg">
            <h2 className="text-2xl font-medium mb-4">What&apos;s Inside The System</h2>
            <ul className="grid md:grid-cols-2 gap-4">
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Automated check-in scheduler</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Satisfaction survey templates</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Quarterly business review framework</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Upsell opportunity tracker</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Referral request scripts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Critical issue alert system</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Case study conversion workflow</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Renewal timeline manager</span>
              </li>
            </ul>
          </div>

          <hr className="my-16 border-line" />

          <div className="text-center">
            <h2 className="text-3xl font-medium mb-6">Ready To Keep More Clients?</h2>
            <p className="text-muted mb-8 max-w-xl mx-auto">
              The Client Growth System includes this complete retention module plus acquisition, 
              sales, delivery, and growth tools — everything agencies need to stop leaking 
              revenue and start building predictable pipelines.
            </p>
            
            {/* Internal linking network */}
            <div className="mb-8 text-left">
              <h3 className="text-lg font-medium mb-4">Related Systems:</h3>
              <ul className="grid md:grid-cols-2 gap-4">
                <li>
                  <Link href="/seo/freelance-client-acquisition" className="underline hover:text-accent">
                    Freelance Client Acquisition Guide →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/agency-scaling-system" className="underline hover:text-accent">
                    Agency Scaling Framework →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/service-business-framing" className="underline hover:text-accent">
                    Service Business Positioning →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/freelance-project-management" className="underline hover:text-accent">
                    Project Management For Freelancers →
                  </Link>
                </li>
              </ul>
            </div>
            
            <Link href="/products/client-growth-system">
              <Button variant="accent" size="lg">
                Get Started Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-line bg-paper">
        <div className="container-page py-16 sm:py-24 max-w-3xl">
          <h2 className="text-3xl font-medium mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-2">Does this work for project-based agencies?</h3>
              <p className="text-muted">Absolutely. Project agencies often lose clients after each engagement. This system 
              helps you structure transitions between projects and identify natural expansion points.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Can I use this for retainer clients too?</h3>
              <p className="text-muted">Yes. Even monthly retainers churn without proactive relationship management. The 
              system ensures you're constantly delivering visible value and catching issues early.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">What if my clients never complain?</h3>
              <p className="text-muted">That can mean two things: excellent service OR no trust. The satisfaction surveys and 
              check-in frameworks help surface real feedback before problems become deal-breakers.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">How do I know when to upsell?</h3>
              <p className="text-muted">The system tracks triggers: their growth signals, new hires, expanded budgets, 
              market shifts. You'll know exactly when they're ready for more and what to offer.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}