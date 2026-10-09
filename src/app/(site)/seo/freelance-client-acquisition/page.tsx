import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Freelance Client Acquisition System | Proven Framework for Finding Clients",
  description: "A step-by-step system for freelancers to acquire clients consistently: prospecting, outreach, follow-ups, proposals, and closing deals without cold-calling anxiety.",
  alternates: { canonical: `${site.url}/seo/freelance-client-acquisition` },
};

export default function FreelanceClientAcquisition() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-paper">
        <div className="container-page py-16 sm:py-24 lg:py-32 text-center">
          <h1 className="text-display-hero mx-auto max-w-4xl">
            Freelance Client Acquisition System That Actually Works
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop guessing how to find paying clients. Use a repeatable process to attract 
            inbound inquiries, convert cold prospects into contracts, and build a pipeline 
            that fills itself month after month.
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
          <h2 className="text-3xl font-medium mb-6">The Problem Every Freelancer Faces</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium mb-3">Feast or Famine Cycles</h3>
              <p className="text-muted">
                Some months you're swimming in leads. The next one, silence. No system means 
                no consistent pipeline, just luck and hope. You need a framework that works 
                whether you're busy or slow.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Cold Outreach Anxiety</h3>
              <p className="text-muted">
                Sending DMs, emails, and pitches feels gross because there's no structure. 
                You don't know what message converts, when to follow up, or how to track 
                who actually cares. Result? You keep avoiding it entirely.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">No Process = Lost Deals</h3>
              <p className="text-muted">
                Prospects say "I'll think about it" and disappear. Why? Because nothing was 
                holding the conversation together. A proper acquisition system maintains 
                momentum through reminders, structured follow-ups, and clear next actions.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Underpricing Because You Desperate</h3>
              <p className="text-muted">
                When your pipeline is empty, you discount to land anything. When you have a 
                steady flow of quality leads, you can charge what you're worth and turn 
                down bad-fit work instead.
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <h2 className="text-3xl font-medium mb-6">How This System Solves It</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Automated Prospect Tracking</h3>
              <p className="text-muted">
                Never lose another lead. Every inquiry gets logged with contact info, 
                conversation notes, and timeline. The system tells you exactly who to 
                follow up with today.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Outreach Templates That Convert</h3>
              <p className="text-muted">
                Copy-paste email sequences, LinkedIn messages, and proposal frameworks 
                tested on real prospects. Plug in your details and send them out knowing 
                they work.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Follow-Up Automation</h3>
              <p className="text-muted">
                Set it once: Day 3 follow-up, Day 7 check-in, 30-day reactivation. The 
                system reminds you when each action happens so nothing slips through.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Pipeline Dashboard</h3>
              <p className="text-muted">
                See everything at once: who's been contacted, who's pending, who needs 
                a proposal sent. Know your conversion rate by channel and optimize what 
                works.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg md:col-span-2">
              <h3 className="text-xl font-medium mb-3">✓ Lead Qualification Framework</h3>
              <p className="text-muted">
                Not every lead deserves your time. Score prospects based on budget, timing, 
                fit, and authority before investing hours. Focus on deals that close fast.
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <div className="bg-blueprint-faint p-8 rounded-lg">
            <h2 className="text-2xl font-medium mb-4">What&apos;s Inside The System</h2>
            <ul className="grid md:grid-cols-2 gap-4">
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Prospect database with custom fields</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>5-email sequence templates</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>LinkedIn outreach scripts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Proposal tracking &amp; version control</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Cold call objection handlers</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Referral request workflows</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Lead scoring rubric</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Weekly activity dashboard</span>
              </li>
            </ul>
          </div>

          <hr className="my-16 border-line" />

          <div className="text-center">
            <h2 className="text-3xl font-medium mb-6">Ready To Fill Your Pipeline?</h2>
            <p className="text-muted mb-8 max-w-xl mx-auto">
              The Client Growth System includes this complete acquisition module plus 
              sales, delivery, retention, and growth tools — everything freelancers need 
              to stop chasing clients and start attracting them.
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
                  <Link href="/seo/freelance-project-management" className="underline hover:text-accent">
                    Freelance Project Management Tools →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/service-business-framing" className="underline hover:text-accent">
                    Service Business Positioning Guide →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/agency-scaling-system" className="underline hover:text-accent">
                    Agency Scaling Without Chaos →
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
              <h3 className="text-lg font-medium mb-2">Is this for solo freelancers or small teams?</h3>
              <p className="text-muted">Both. Solo consultants use it to stay organized. Small agencies (2–5 people) use 
              it as their shared CRM and pipeline management tool.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">What if I&apos;m already using Excel or Notion?</h3>
              <p className="text-muted">Those work until they break. This system automates the reminders and follow-ups 
              you've been forgetting manually. Many users switch mid-project and save 5+ hours weekly.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Can I use this for B2B or B2C clients?</h3>
              <p className="text-muted">B2B service businesses are the sweet spot (agencies, consultants, contractors). 
              B2C works but requires adjusting the messaging templates slightly.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">How long until I see results?</h3>
              <p className="text-muted">If you implement one new outreach sequence per week, expect your first converted 
              deal within 2–3 weeks. Building a full pipeline takes 60–90 days of consistent use.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}