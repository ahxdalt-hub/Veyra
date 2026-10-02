import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import { LOGO_URL, ORGANIZATION_ID } from "@/lib/seo";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FoundingBanner } from "@/components/layout/founding-banner";
import { CartProvider } from "@/components/cart/cart-context";
import { HeaderSearchProvider } from "@/components/search/search-context";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  // No layout-level `alternates.canonical` on purpose: a canonical set
  // here is inherited by any page under (site) that doesn't declare its
  // own, which would quietly point that page at the homepage. Every page
  // sets its own canonical instead.
  // No explicit openGraph object: the opengraph-image.tsx file convention
  // supplies og:image (with its hashed URL), and title/description/type
  // flow from the fields above. twitter card mirrors automatically.
  openGraph: {
    type: "website",
    siteName: site.name,
    url: "/",
    locale: "en_US",
    // Title/description intentionally omitted so file-convention metadata
    // merges cleanly; og:image comes from opengraph-image.tsx.
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf8",
  width: "device-width",
  initialScale: 1,
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    // Stable @id so the WebSite node on the homepage can reference this
    // same Organization entity instead of repeating an anonymous copy.
    "@id": ORGANIZATION_ID,
    name: site.name,
    url: site.url,
    logo: LOGO_URL,
    email: site.contact.email,
    description: site.description,
  };

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xs focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <HeaderSearchProvider>
        <CartProvider>
          <FoundingBanner />
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </HeaderSearchProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
    </div>
  );
}
