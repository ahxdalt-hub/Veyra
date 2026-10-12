import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { Problem } from "@/components/home/problem";
import { Featured } from "@/components/home/featured";
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
 * Homepage — a sales funnel in eleven sections:
 * Hero → Problem → Product → How → Why → Collection →
 * Lead magnet → FAQ → Final CTA. (The twelve-module breakdown lives on
 * the product page; the homepage no longer repeats it.) */

export const metadata: Metadata = {
  title: {
    absolute:
      "Client Growth System for Freelancers & Agencies | Local-First Desktop OS | Veyra",
  },
  description:
    "Turn scattered leads into clients you keep. Veyra is a local-first desktop operating system for freelancers, consultants & agencies — one-time purchase, your data on your computer, no monthly fees, works offline.",
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
    title: "Veyra | Turn Scattered Leads Into Clients You Keep",
    description:
      "A local-first desktop operating system for freelancers, consultants & agencies. One-time purchase, your data on your computer, no monthly fees, works offline.",
    url: site.url,
    siteName: "Veyra",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Veyra | Turn Scattered Leads Into Clients You Keep",
    description:
      "A local-first desktop operating system for freelancers, consultants & agencies. One-time purchase, your data on your computer, no monthly fees, works offline.",
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
