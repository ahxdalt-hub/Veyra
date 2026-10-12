import type { Metadata } from "next";
import Link from "next/link";
import { site, formatPrice, REFUND_WINDOW_LABEL } from "@/lib/site";
import { FOUNDING_PRICE, REGULAR_PRICE } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "What Is A Client Growth System? | Complete Framework For Service Businesses",
  description: "Understand what a client growth system is: a structured approach combining acquisition, sales, delivery, retention, and growth to turn one-off projects into recurring revenue.",
  alternates: { canonical: `${site.url}/seo/client-growth-system` },
};

export default function WhatIsClientGrowthSystem() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-paper">
        <div className="container-page py-16 sm:py-24 lg:py-32 text-center">
          <h1 className="text-display-hero mx-auto max-w-4xl">
            What Is A Client Growth System — And Why Do You Need One?
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            It&apos;s not another spreadsheet or generic CRM. It&apos;s an operating system that connects 
            every part of your service business — from finding prospects to retaining them long-term — so you stop leaking revenue and start compounding results.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3">
            <Link href="/products/client-growth-system">
              <Button variant="accent" size="lg">
                See The Complete System
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
          <h2 className="text-3xl font-medium mb-6">The Problem With Fragmented Business Tools</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-medium mb-3">You Have Too Many Tools That Don&apos;t Talk</h3>
              <p className="text-muted">
                Prospects live in LinkedIn DMs. Proposals sit in Gmail. Project files are scattered 
                across Google Drive. Client feedback ends up in Slack threads. Nothing connects, 
                nothing reminds you, nothing compounds effort over time.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Each Stage Feels Like Starting Over</h3>
              <p className="text-muted">
                Acquisition feels like hunting because there's no process. Sales turns into 
                expensive negotiation because you can't show outcomes. Delivery becomes reactive 
                firefighting instead of planned work. Retention disappears once the contract signs.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">Revenue Depends On You Being In A Good Mood</h3>
              <p className="text-muted">
                Some weeks you're motivated to prospect and follow up religiously. Other weeks 
                everything slips. There's no baseline standard that keeps performance consistent 
                regardless of how you feel that day.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-3">No Single Source Of Truth</h3>
              <p className="text-muted">
                Ask yourself: which prospect am I supposed to follow up with tomorrow? How many 
                proposals are pending? Who needs a check-in call this week? If the answer isn't 
                visible at a glance, your business is running on luck.
              </p>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <h2 className="text-3xl font-medium mb-6">The Six Stages A Real Client Growth System Covers</h2>
          
          <div className="space-y-12">
            {/* Stage 1: Foundation */}
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-accent">01</div>
                <div>
                  <h3 className="text-xl font-medium mb-3">Foundation: Position Yourself Clearly</h3>
                  <p className="text-muted mb-4">
                    Before acquiring anyone, define exactly who you serve, what outcome you deliver, 
                    why you're different, and what success looks like for clients. Without this clarity, 
                    everyone competes on price and nobody sees you as unique enough to justify premium fees.
                  </p>
                  <ul className="grid md:grid-cols-2 gap-3">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Ideal client profile builder</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Value proposition framework</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Offer tier structure</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Case study library</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Stage 2: Acquire */}
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-accent">02</div>
                <div>
                  <h3 className="text-xl font-medium mb-3">Acquire: Find Qualified Leads Consistently</h3>
                  <p className="text-muted mb-4">
                    Stop relying on referrals that dry up after big projects end. Build a pipeline 
                    where qualified leads surface regularly from multiple channels, with automated 
                    outreach sequences that convert without feeling sleazy.
                  </p>
                  <ul className="grid md:grid-cols-2 gap-3">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Prospect database &amp; tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Email sequence templates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>LinkedIn outreach scripts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Follow-up automation</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Stage 3: Sell */}
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-accent">03</div>
                <div>
                  <h3 className="text-xl font-medium mb-3">Sell: Close Deals Without Discounting</h3>
                  <p className="text-muted mb-4">
                    Stop undervaluing yourself because you need the money this month. Present clear 
                    proposals that showcase ROI, handle objections systematically, and move deals 
                    forward without endless negotiations that erode margins.
                  </p>
                  <ul className="grid md:grid-cols-2 gap-3">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Proposal templates &amp; version control</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Pricing calculator with margin checks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Objection handling scripts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Closing checklist &amp; follow-ups</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Stage 4: Deliver */}
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-accent">04</div>
                <div>
                  <h3 className="text-xl font-medium mb-3">Deliver: Ship Quality Work Without Burnout</h3>
                  <p className="text-muted mb-4">
                    Clients stay happy when you communicate proactively. Deadlines get met without 
                    all-nighters. You stop feeling like you're drowning in a hundred loose threads.
                  </p>
                  <ul className="grid md:grid-cols-2 gap-3">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Project timeline builder</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Automated status updates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Scope change tracker</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Milestone completion log</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Stage 5: Retain */}
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-accent">05</div>
                <div>
                  <h3 className="text-xl font-medium mb-3">Retain: Keep Clients Longer & Increase Lifetime Value</h3>
                  <p className="text-muted mb-4">
                    The best time to upsell is right after they're happy. Schedule proactive check-ins, 
                    track their wins and milestones, alert you when new opportunities arise, and turn 
                    satisfied project clients into long-term partners.
                  </p>
                  <ul className="grid md:grid-cols-2 gap-3">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Check-in scheduler</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Satisfaction survey system</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Upsell opportunity tracker</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Referral request workflows</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Stage 6: Grow */}
            <div className="bg-accent-soft/40 p-8 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="text-4xl font-bold text-accent">06</div>
                <div>
                  <h3 className="text-xl font-medium mb-3">Grow: Scale Revenue Without Adding Chaos</h3>
                  <p className="text-muted mb-4">
                    When you're ready to grow beyond solo capacity, document processes so others can 
                    execute them. Hire people who don't need hand-holding. Forecast growth based on 
                    real numbers, not hope. Maintain quality while expanding scope.
                  </p>
                  <ul className="grid md:grid-cols-2 gap-3">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>SOP documentation builder</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Team capacity planning</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Growth projection model</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">✓</span>
                      <span>Quality assurance checkpoints</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <div className="bg-blueprint-faint p-8 rounded-lg">
            <h2 className="text-2xl font-medium mb-4">Why Most Systems Fail (&amp; Why This Doesn&apos;t)</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-medium mb-2">❌ Generic CRMs (HubSpot, Salesforce)</h3>
                <p className="text-muted">Made for enterprises with dedicated operations teams. Overwhelming complexity, bloated features, expensive per-user pricing.</p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">❌ Spreadsheets & Notion Templates</h3>
                <p className="text-muted">Flexible until you need reminders, automations, or shared visibility. No built-in frameworks for business workflows.</p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">❌ Project Management Tools (Asana, Trello)</h3>
                <p className="text-muted">Great for task tracking but zero support for acquisition, sales, retention, or growth thinking. You'll still need separate tools for those.</p>
              </div>

              <div>
                <h3 className="text-xl font-medium mb-2">✓ The Client Growth System</h3>
                <p className="text-muted">Built specifically for freelancers, consultants, and small agencies who do actual client work. All six stages connected in one application. No subscription required. Works offline after setup.</p>
              </div>
            </div>
          </div>

          <hr className="my-16 border-line" />

          <div className="text-center">
            <h2 className="text-3xl font-medium mb-6">Ready To Implement Your Own Client Growth System?</h2>
            <p className="text-muted mb-8 max-w-xl mx-auto">
              Every stage above is pre-built inside the desktop application you get immediately. 
              Download it today, configure your first workflow in 15 minutes, and start seeing 
              the difference a real system makes.
            </p>
            
            {/* Internal linking network */}
            <div className="mb-8 text-left">
              <h3 className="text-lg font-medium mb-4">Deep Dives Into Each Stage:</h3>
              <ul className="grid md:grid-cols-2 gap-4">
                <li>
                  <Link href="/seo/freelance-client-acquisition" className="underline hover:text-accent">
                    Client Acquisition Framework →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/agency-client-retention-system" className="underline hover:text-accent">
                    Client Retention Systems →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/freelance-project-management" className="underline hover:text-accent">
                    Project Management Guide →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/agency-scaling-system" className="underline hover:text-accent">
                    Agency Scaling Strategies →
                  </Link>
                </li>
                <li>
                  <Link href="/seo/service-business-framing" className="underline hover:text-accent">
                    Service Business Positioning →
                  </Link>
                </li>
              </ul>
            </div>
            
            <Link href="/products/client-growth-system">
              <Button variant="accent" size="lg">
                Get The Client Growth System Today
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
              <h3 className="text-lg font-medium mb-2">Is this just another course about systems?</h3>
              <p className="text-muted">No. Courses teach concepts. This application implements them — you build your actual 
              client acquisition database, manage live projects, track retention metrics, run growth 
              forecasts using real data from your business.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Does it integrate with other tools?</h3>
              <p className="text-muted">This is designed as your single source of truth for business operations. Email exports
              and CSV imports allow you to sync external tools if needed, but it&apos;s built to handle
              your client operations in one place.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Can I use this if I&apos;m already busy?</h3>
              <p className="text-muted">Yes. Set it up gradually — start with one stage at a time. Begin with Foundation,
              then add Acquisition the next month as you begin prospecting more systematically.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">What if I&apos;m only doing freelance work now?</h3>
              <p className="text-muted">Even solo use gives huge benefits. But this same system scales naturally as you hire 
              contractors, bring on junior staff, or transition to agency model — no migration needed.</p>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">How does this differ from hiring a consultant?</h3>
              <p className="text-muted">A consultant charges $200–$500/hour to tell you what systems you should build. This is 
              the actual system — delivered ready-to-use for less than one hour of consulting fees.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}