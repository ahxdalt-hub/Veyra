import type { Metadata } from "next";

/**
 * Checkout layout — metadata only. The flow itself lives in page.tsx.
 * Checkout and result pages stay out of search indexes.
 */
export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Veyra purchase.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
