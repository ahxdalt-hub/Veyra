import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Service Business Framing System | Position Your Offer For Premium Pricing",
  description: "Learn to position your services clearly, stand out in a crowded market, and command higher prices by solving specific business outcomes instead of vague promises.",
  alternates: { canonical: `${site.url}/seo/service-business-framing` },
};

export default function ServiceBusinessFraming() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-paper">
        <div className="container-page py-16 sm:py-24 lg:py-32 text-center">
          <h1 className="text-display-hero mx-auto max-w-4xl">
            Service Business Framing That Commands Premium Prices
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop competing on price. Build positioning that makes your offer impossible to 
            ignore, attracts clients who value quality over cost, and gives you a clear 
            reason why you're worth every dollar.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/products/client-growth-system">
              <Button variant="accent" size="lg">
                Get the Client Growth System
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-24">
        <div className="container-page max-w-4xl">
          <h2 className="text-3xl font-medium mb-6">Why Good Services Go Unnoticed</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium mb-3">Generic Positioning Gets Generic Pricing</h3>
              <p className="text-muted">
                "I do SEO," "I'm a marketing consultant," "graphic designer available" — these 
                don't differentiate you. They just add to the noise. Clients compare you against 
                everyone else and pick the cheapest option. Specific framing prevents this.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Vague Outcomes = Price Shopping</h3>
              <p className="text-muted">
                If you promise "more traffic" or "better branding," there's no way to measure 
                whether you actually delivered. Without clear success metrics, clients assume 
                results are luck rather than expertise. And they negotiate harder when value is ambiguous.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Wrong Audience Attracts Tougher Clients</h3>
              <p className="text-muted">
                Market yourself to "anyone who needs help" and you'll attract anyone looking 
                for cheap help. Position for the specific buyer who understands the problem 
                you solve — suddenly you're talking to qualified leads, not tire-kickers.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Underpricing Because You Can&apos;t Articulate Value</h3>
              <p className="text-muted">
                Deep down you know you deliver real ROI. But when you try to explain what you 
                do, it sounds like everything else. So you drop to $75/hr because you're scared 
                they'll say no at $150/hr. A structured framing system fixes this at the root.
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <h2 className="text-3xl font-medium mb-6">How This System Solves It</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Positioning Framework Builder</h3>
              <p className="text-muted">
                Define exactly who you serve, what outcome you guarantee, your unique mechanism, 
                and proof points. One coherent message that works across your website, proposals, 
                and conversations.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Offer Architecture Templates</h3>
              <p className="text-muted">
                Structure tiers that make sense: starter package for quick wins, flagship for 
                core work, premium for full-service. Each tier has clear boundaries so clients 
                self-select into what they need without negotiation fatigue.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Case Study Conversion System</h3>
              <p className="text-muted">
                Turn every completed project into a sellable case study with before/after metrics, 
                client quotes, and process documentation. Social proof becomes your sales engine.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Pricing Psychology Tools</h3>
              <p className="text-muted">
                Anchor high without scaring people away. Use value-based pricing frameworks 
                instead of hour rates. Show ROI calculations that make your fee look small 
                compared to their expected returns.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg md:col-span-2">
              <h3 className="text-xl font-medium mb-3">✓ Differentiation Matrix</h3>
              <p className="text-muted">
                Map out how you differ from competitors on six dimensions: speed, quality, 
                specialization, methodology, guarantees, and relationship model. Find where 
                you're genuinely unique and double down on it.
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <div className="bg-blueprint-faint p-8 rounded-lg">
            <h2 className="text-2xl font-medium mb-4">What&apos;s Inside The System</h2>
            <ul className="grid md:grid-cols-2 gap-4">
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Positioning worksheet &amp; templates</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Offer tier builder</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Ideal client profile definition tool</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Value proposition canvas</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Casestudy case library</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Pricing calculator</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Competitor comparison framework</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Elevator pitch builder</span>
              </li>
            </ul>
          </div>

          <hr className="my-16 border-line" />

          <div className="text-center">
            <h2 className="text-3xl font-medium mb-6">Ready To Charge What You&apos;re Worth?</h2>
            <p className="text-muted mb-8 max-w-xl mx-auto">
              The Client Growth System includes this complete foundation module plus acquisition, 
              sales, delivery, retention, and growth tools — everything service businesses need 
              to stop competing on price and start commanding premium fees.
            </p>
            
            {/* Internal linking network */}
            <div className="mb-8 text-left">
              <h3 className="text-lg font-medium mb-4">Related Systems:</h3>
              <ul className="grid md:grid-cols-2 gap-4">
                <li>
                  <Link href="/seo/client-growth-system" className="underline hover:text-accent">
                    Complete Client Growth Framework →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/freelance-client-acquisition" className="underline hover:text-accent">
                    Freelance Client Acquisition →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/agency-scaling-system" className="underline hover:text-accent">
                    Agency Scaling Without Chaos →
                  </Link>
                </li>
                <li>
                  <Link href="/products/client-growth-system" className="underline hover:text-accent">
                    View Full Product →
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
              <h3 className="text-lg font-medium mb-2">Can I reposition an existing business?</h3>
              <p className="text-muted">Absolutely. Many users use this to refine how they've been describing themselves 
              informally, then apply it consistently everywhere for more consistent inquiries.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">What if my market is too niche?</h3>
              <p className="text-muted">Niche is strength, not weakness. The clearer your positioning, the less competition 
              you have. Better to be #1 for "SEO for dental practices" than middle-of-the-road 
              for "marketing consultant."</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Will this help with proposal writing?</h3>
              <p className="text-muted">Yes. When your positioning is crystal clear, every proposal becomes easier. You 
              already know what problem you solve — now you write directly to that pain point.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Does this replace branding work?</h3>
              <p className="text-muted">No, it strengthens it. Branding helps you look distinctive. Framing explains WHY 
              someone should care. They work together — this gives you the strategic foundation.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}