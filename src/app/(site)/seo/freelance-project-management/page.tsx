import type { Metadata } from "next";
import Link from "next/link";
import { site, formatPrice, REFUND_WINDOW_LABEL } from "@/lib/site";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Freelance Project Management System | Deliver Consistently Without Burnout",
  description: "Stop juggling multiple projects with spreadsheets and sticky notes. Use a single system to track deadlines, automate client updates, and deliver quality work on time.",
  alternates: { canonical: `${site.url}/seo/freelance-project-management` },
};

export default function FreelanceProjectManagement() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-paper">
        <div className="container-page py-16 sm:py-24 lg:py-32 text-center">
          <h1 className="text-display-hero mx-auto max-w-4xl">
            Freelance Project Management That Doesn&apos;t Feel Like Admin
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Clients stay happy when you communicate proactively. Deadlines get met without 
            all-nighters. You stop feeling like you're drowning in a hundred loose threads.
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
          <h2 className="text-3xl font-medium mb-6">Why Freelancers Struggle With Delivery</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium mb-3">Client Constantly Asking "Where Are We?"</h3>
              <p className="text-muted">
                They don't mean to annoy you — they just have no visibility into your progress. 
                Every email asking for a status update pulls you away from actual work. What if 
                you could send updates automatically before they even ask?
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Forgotten Follow-Ups From Calls</h3>
              <p className="text-muted">
                You had a great discovery call, made notes mentally… then three days later 
                realized you never sent that proposal or clarified that scope question. A proper 
                delivery system logs every action item and reminds you when it's due.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Multiple Projects = Chaos</h3>
              <p className="text-muted">
                Client A needs files by Wednesday. Client B wants revisions by Friday. Client C 
                approved at 9pm Tuesday — now you have to wake up Saturday morning because nothing 
                was scheduled. The right tools prevent this from being your life.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Scope Creep Eats Your Margins</h3>
              <p className="text-muted">
                "Can you just add this small thing?" becomes five small things. Suddenly you're 
                doing extra work without getting paid more. A structured delivery system documents 
                exactly what's included and tracks any scope changes formally.
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <h2 className="text-3xl font-medium mb-6">How This System Solves It</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Automated Client Updates</h3>
              <p className="text-muted">
                Schedule weekly status reports per project. They get sent automatically every 
                Monday morning showing progress, blockers, next steps. No manual emails required.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Deadline Dashboard</h3>
              <p className="text-muted">
                See everything due this week, this month, across all clients at one glance. 
                Know exactly which projects need attention today versus next week.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ File Version Control</h3>
              <p className="text-muted">
                Never lose a revision again. Track v1, v2, final_FINAL.pdf with timestamps, 
                who requested each change, and approval signatures locked into records.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <h3 className="text-xl font-medium mb-3">✓ Scope Change Tracker</h3>
              <p className="text-muted">
                New request? Log it against the original brief, estimate hours, send them a 
                formal change order through the system. Keep margins intact without awkward 
                conversations.
              </p>
            </div>

            <div className="bg-accent-soft/40 p-8 rounded-lg md:col-span-2">
              <h3 className="text-xl font-medium mb-3">✓ Communication Timeline</h3>
              <p className="text-muted">
                All emails, call notes, Slack messages tied to a single project record. When 
                someone asks "what did we agree on?", pull up the thread immediately without 
                hunting through DMs or email threads.
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <div className="bg-blueprint-faint p-8 rounded-lg">
            <h2 className="text-2xl font-medium mb-4">What&apos;s Inside The System</h2>
            <ul className="grid md:grid-cols-2 gap-4">
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Project timeline builder</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Automated check-in scheduler</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Milestone completion tracker</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Client feedback log</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Resource allocation view</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Billing milestone triggers</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Delivery checklist templates</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent">→</span>
                <span>Post-project retrospective form</span>
              </li>
            </ul>
          </div>

          <hr className="my-16 border-line" />

          <div className="text-center">
            <h2 className="text-3xl font-medium mb-6">Ready To Ship Work Stress-Free?</h2>
            <p className="text-muted mb-8 max-w-xl mx-auto">
              The Client Growth System includes this complete delivery module plus acquisition, 
              sales, retention, and growth tools — everything freelancers need to deliver 
              consistently while building a reputation that keeps clients coming back.
            </p>
            
            {/* Internal linking network */}
            <div className="mb-8 text-left">
              <h3 className="text-lg font-medium mb-4">Related Systems:</h3>
              <ul className="grid md:grid-cols-2 gap-4">
                <li>
                  <Link href="/seo/freelance-client-acquisition" className="underline hover:text-accent">
                    Client Acquisition Framework →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/agency-client-retention-system" className="underline hover:text-accent">
                    Client Retention Strategies →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/service-business-framing" className="underline hover:text-accent">
                    Service Business Positioning →
                  </Link>
                </li>
                <li>
                  <Link href="/products/client-growth-system" className="underline hover:text-accent">
                    View Complete System →
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
              <h3 className="text-lg font-medium mb-2">Is this better than Asana or Trello?</h3>
              <p className="text-muted">Those are general task managers. This is built specifically for freelancer-client 
              workflows: scopes, approvals, billing milestones, version control, client updates.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">What if I work with only one client at a time?</h3>
              <p className="text-muted">Even solo projects benefit from having a single source of truth for everything. 
              Plus you'll never forget follow-ups or miss a milestone deadline.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Do clients see anything directly?</h3>
              <p className="text-muted">No — this stays in your application. But the automated updates they receive 
              make them feel like you're over-delivering, even though you're working more efficiently.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">How much setup time does this take?</h3>
              <p className="text-muted">You can configure your first project in 15 minutes. Setting up your standard 
              delivery templates takes an hour, then you reuse them forever.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}