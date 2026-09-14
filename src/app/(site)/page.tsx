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
import { site } from "@/lib/site";

/**
 * Homepage — a sales funnel in ten sections:
 * Hero → Problem → Product → What's inside → How → Why → Collection →
 * Lead magnet → FAQ → Final CTA.
 */

export default function Home() {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    description: site.description,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
    </>
  );
}
