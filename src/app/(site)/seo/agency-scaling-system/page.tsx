import type { Metadata } from "next";
import Link from "next/link";
import { site, formatPrice, REFUND_WINDOW_LABEL } from "@/lib/site";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Agency Scaling System | Grow Revenue Without Adding Chaos",
  description: "Scale your agency from solo to team without losing quality. Systems for hiring, delegation, SOPs, and growth forecasting that work at every size.",
  alternates: { canonical: `${site.url}/seo/agency-scaling-system` },
};

export default function AgencyScalingSystem() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-paper">
        <div className="container-page py-16 sm:py-24 lg:py-32 text-center">
          <h1 className="text-display-hero mx-auto max-w-4xl">
            Scale Your Agency Without Losing Your Mind
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Growth should feel good, not chaotic. Build systems that handle new clients 
            while maintaining quality, hire people who don't need hand-holding, and forecast 
            revenue with actual confidence instead of hope.
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
          <h2 className="text-3xl font-medium mb-6">Why Most Agencies Hit a Growth Ceiling</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium mb-3">Everything Lives In Your Head</h3>
              <p className="text-muted">
                You're amazing at what you do — which means everything works when YOU do it. 
                But how do you teach that to someone else? No documented process = no scale.
                What gets scaled stays limited to your capacity.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">The Founder's Time Tax</h3>
              <p className="text-muted">
                Every time you take on a new client, you're also taking on more complexity: 
                more meetings, more approvals, more status updates. Before you know it, 
                you're working more than when you were smaller — just busier doing less.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Quality Dips At New Size</h3>
              <p className="text-muted">
                Took on two new accounts and now your delivery isn't as crisp. Clients notice. 
                Referrals slow down. The irony is real: scaling breaks the very thing that 
                made them buy in the first place.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Hiring Feels Risky</h3>
              <p className="text-muted">
                One bad hire costs months of energy and money. But going slower means staying 
                stuck at your current revenue level. How do you grow confidently without 
                guessing about talent and training?
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <h2 className="text-3xl font-medium mb-6">How This System Solves It</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Documented Workflows Everywhere</h3>
              <p className="text-muted">
                Every recurring task has written instructions: discovery call structure, 
                proposal review process, project kickoff steps, monthly reporting template. 
                Train anyone using the same playbook you followed when you started.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Role Delegation Matrix</h3>
              <p className="text-muted">
                Know exactly who owns what decisions. When should a junior execute vs. 
                when does it escalate to senior vs. founder? Clear RACI-style charts prevent 
                bottlenecks and confusion.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Capacity Planning Dashboard</h3>
              <p className="text-muted">
                See who's overloaded before you onboard new clients. Track utilization rates, 
                available hours by role, and projected workload 30–90 days out. Hire 
                strategically instead of reactively.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Growth Forecast Model</h3>
              <p className="text-muted">
                Input pipeline numbers → system shows likely revenue 3/6/12 months out given 
                your team capacity, conversion rates, and average deal size. Make hiring 
                decisions based on math, not gut feelings.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg md:col-span-2">
              <h3 className="text-xl font-medium mb-3">✓ Quality Assurance Checkpoints</h3>
              <p className="text-muted">
                Built-in reviews at critical stages: pre-send proposal quality check, 
                post-delivery satisfaction survey, quarterly team retrospectives. Catch 
                issues before they become reputation problems.
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <div className="bg-blueprint-faint p-8 rounded-lg">
            <h2 className="text-2xl font-medium mb-4">What&apos;s Inside The System</h2>
            <ul className="grid md:grid-cols-2 gap-4">
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>SOP builder with version control</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Team capacity planning tool</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Role definitions &amp; competency frameworks</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Hiring scorecards by position</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Growth projection calculator</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Client satisfaction tracking</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Team meeting templates</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Performance review workflows</span>
              </li>
            </ul>
          </div>

          <hr className="my-16 border-line" />

          <div className="text-center">
            <h2 className="text-3xl font-medium mb-6">Ready To Scale With Confidence?</h2>
            <p className="text-muted mb-8 max-w-xl mx-auto">
              The Client Growth System includes this complete growth module plus acquisition, 
              sales, delivery, retention tools — everything agencies need to scale revenue 
              without sacrificing quality or sanity.
            </p>
            
            {/* Internal linking network */}
            <div className="mb-8 text-left">
              <h3 className="text-lg font-medium mb-4">Related Systems:</h3>
              <ul className="grid md:grid-cols-2 gap-4">
                <li>
                  <Link href="/seo/agency-client-retention-system" className="underline hover:text-accent">
                    Agency Client Retention Framework →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/service-business-framing" className="underline hover:text-accent">
                    Service Business Positioning Guide →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/freelance-project-management" className="underline hover:text-accent">
                    Freelance Project Management →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/client-growth-system" className="underline hover:text-accent">
                    What Is A Client Growth System? →
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
              <h3 className="text-lg font-medium mb-2">Is this for teams or solo founders?</h3>
              <p className="text-muted">Both. Solo use it to prepare for hiring. Teams use it to manage multiple people, 
              align on processes, and coordinate complex projects.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">What size agencies benefit most?</h3>
              <p className="text-muted">Agencies with more than one person benefit most — once there&apos;s anyone to
              coordinate with, a shared system starts to pay off. Smaller teams use it to get
              organized before they hire.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Can I customize the workflows?</h3>
              <p className="text-muted">Every agency works differently. Start with our templates, then modify fields, 
              add your terminology, adjust stages — this is meant to match your reality.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Does this integrate with Slack or Notion?</h3>
              <p className="text-muted">This runs as a standalone application focused on business operations. Data 
              exports are available if you want to sync external tools.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}