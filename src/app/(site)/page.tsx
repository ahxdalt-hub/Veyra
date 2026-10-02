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
      "Veyra | Client Growth System for Freelancers & Service Businesses",
  },
  description:
    "Veyra is a practical client growth system for freelancers, consultants, and service businesses to organize client acquisition, sales, delivery, retention, and growth.",
  alternates: { canonical: "/" },
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
