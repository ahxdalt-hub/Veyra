import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { Problem } from "@/components/home/problem";
import { Featured } from "@/components/home/featured";
import { WhatsInside } from "@/components/home/whats-inside";
import { HowItWorks } from "@/components/home/how-it-works";
import { Why } from "@/components/home/why";
import { Collection } from "@/components/home/collection";
import { LeadMagnet } from "@/components/home/lead-magnet";
import { Faq } from "@/components/home/faq";
import { FinalCta } from "@/components/home/final-cta";
import { PartnerCta } from "@/components/home/partner-cta";
import { CompetitorComparison } from "@/components/seo/competitor-comparison";
import { site } from "@/lib/site";
import { ORGANIZATION_ID, WEBSITE_ID } from "@/lib/seo";

/**
 * Homepage — a sales funnel in ten sections:
 * Hero → Problem → Product → What's inside → How → Why → Collection →
 * Lead magnet → FAQ → Final CTA.
 */

export const metadata: Metadata = {
  title: {
    absolute:
      "Local-First Business OS | Lifetime Deal - No Monthly Fees | Veyra",
  },
  description:
    "Stop paying monthly fees for CRM software. Veyra is a local-first business operating system for freelancers, consultants & agencies. Your data on your computer, one-time purchase, forever access. Works offline. Privacy-focused.",
  keywords: [
    "local first software",
    "business operating system",
    "lifetime deal software",
    "one time purchase CRM",
    "offline business app",
    "freelancer software Windows Mac",
    "consultant tools no subscription",
    "agency management desktop",
    "privacy focused business software",
    "local first database",
    "no cloud software",
    "data ownership software",
    "independent consultant tools",
    "solo entrepreneur software",
    "small business OS no monthly fee",
    "desktop CRM alternative",
    "local storage business app",
    "client management offline",
    "project management personal computer",
    "buy once use forever software",
  ].join(", "),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Veyra | Local-First Business OS — One Payment, Forever Access",
    description:
      "The smarter choice for freelancers, consultants & agencies: your data lives locally on your computer, not in someone else's cloud. One-time payment = lifetime access. Works offline. No data mining.",
    url: site.url,
    siteName: "Veyra",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Veyra | Your Data, Your Computer, Your Software",
    description:
      "Tired of SaaS subscriptions? Our local-first business OS works offline, stores your data locally, and costs one payment — forever. Built for privacy-focused professionals.",
  },
};

export default function Home() {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: "en",
    // Tie the site entity to the Organization published in the site
    // layout via its @id. No `potentialAction`/SearchAction here: the
    // header search is a client-side dialog over the catalog with no
    // crawlable URL, so a SearchAction target would be invented.
    publisher: { "@id": ORGANIZATION_ID },
  };

  return (
    <>
      <Hero />
      <Problem />
      <Featured />
      <WhatsInside />
      <HowItWorks />
      <Why />
      <Collection />
      <CompetitorComparison />
      <LeadMagnet />
      <Faq />
      <FinalCta />
      <PartnerCta />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
    </>
  );
}
