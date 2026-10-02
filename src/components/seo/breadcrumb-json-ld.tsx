import { breadcrumbListJsonLd, type BreadcrumbItem } from "@/lib/seo";

/**
 * BreadcrumbJsonLd — structured data for a breadcrumb trail that is
 * already rendered as visible, crawlable navigation. Renders nothing
 * when there is no real trail to describe (fewer than two crumbs).
 */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  if (items.length < 2) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbListJsonLd(items)),
      }}
    />
  );
}
