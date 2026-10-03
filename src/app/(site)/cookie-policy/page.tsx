import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Every cookie Veyra sets, what it does, how long it lasts, and why no consent banner is needed.",
  alternates: { canonical: "/cookie-policy" },
  openGraph: { title: "Cookie Policy — Veyra", url: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cookie Policy"
      updated="October 2026"
      intro="Veyra sets a small number of cookies — all of them either strictly necessary or first-party functional. This page names each one, describes what it is for, and explains why there is no consent banner on this site."
      summary={[
        { label: "Set by us", value: "Session, admin-access, and cart-state only" },
        { label: "Third-party cookies", value: "None" },
        { label: "Advertising or tracking", value: "None" },
        { label: "Consent banner", value: "Not required — nothing non-essential is set" },
      ]}
      sections={[
        {
          heading: "Do you need to click accept or reject?",
          body: (
            <p>
              No — and that is deliberate. Consent banners under GDPR and
              ePrivacy are legally required only for cookies that are not
              strictly necessary for the service you have asked for. Every
              cookie Veyra sets either keeps you signed in, protects the admin
              area, or holds a shopping cart you have actively built. There
              are no advertising cookies, no cross-site trackers, and no
              analytics on this site. Because nothing beyond the essentials is
              set, there is nothing to opt in to or out of just to use Veyra.
              If we ever add a non-essential cookie, this page and a consent
              banner will change before it goes live.
            </p>
          ),
        },
        {
          heading: "Essential sign-in cookie",
          body: (
            <p>
              When you create a Veyra customer account or sign in, our
              authentication provider (Supabase) sets a session cookie so the
              site knows you are signed in as you browse. It is named with the
              prefix <code>sb-</code> followed by our project reference, is
              HttpOnly (a page&rsquo;s scripts cannot read it), SameSite=Lax,
              scoped to this host only, and lasts for your session. Without it
              signing in is impossible, which is why it is exempt from consent.
            </p>
          ),
        },
        {
          heading: "Admin-access cookie",
          body: (
            <p>
              Veyra&rsquo;s admin command center sets a second, separate session
              cookie named <code>veyra-cc-vault</code> when an operator signs in
              at the admin door. It is HttpOnly, SameSite=Lax, scoped to this
              host, and carries only a signed token that lets the admin
              middleware recognize a cleared operator session. Ordinary customers
              never see this cookie — it is not set unless you sign in through
              the admin path.
            </p>
          ),
        },
        {
          heading: "Cart state",
          body: (
            <p>
              Your shopping cart is stored in your own browser&rsquo;s
              <em> local storage</em> — not a cookie. Local storage is scoped to
              this site and is not sent to our servers with every request the
              way a cookie is. Clearing it simply empties your cart; there is no
              cross-site or cross-session identifier involved.
            </p>
          ),
        },
        {
          heading: "The referral cookie Veyra reads",
          body: (
            <p>
              Veyra is a{" "}
              <a
                href={site.parentUrl}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                {site.parent}
              </a>{" "}
              brand hosted at <code>veyra.caelmont.in</code>. {site.parent} runs
              a partner program that sets a signed, opaque <code>cm_ref</code>{" "}
              cookie on the shared <code>.caelmont.in</code> domain when a
              visitor arrives through a partner referral link. Because that
              cookie&rsquo;s domain covers every subdomain beneath{" "}
              <code>caelmont.in</code>, Veyra&rsquo;s checkout can read the value
              directly off the request and pass it to the payment processor and
              back to {site.parent}, so the referring partner is credited for
              your purchase. Veyra never sets, decodes, or stores the token
              itself — the signing key lives only on {site.parent}. If you
              arrived directly, by bookmark, or by typing the URL, no{" "}
              <code>cm_ref</code> cookie is set or read. You can inspect or
              delete it in your browser at any time; blocking it only means no
              partner gets credited for a purchase you make.
            </p>
          ),
        },
        {
          heading: "No analytics or tracking cookies",
          body: (
            <p>
              Veyra currently runs no analytics script, no advertising pixel,
              no third-party tracker, and no fingerprinting of any kind. Nothing
              about how you browse this site is measured or sent to a third
              party. If we later add aggregate measurement, it will be
              cookieless and this page will say exactly what it does before it
              is switched on.
            </p>
          ),
        },
        {
          heading: "How long does each cookie last?",
          body: (
            <ul>
              <li>
                Sign-in session (<code>sb-&hellip;</code>) &mdash; until you
                sign out or the session expires.
              </li>
              <li>
                Admin-access session (<code>veyra-cc-vault</code>) &mdash; until
                you sign out of the admin area.
              </li>
              <li>
                Cart (local storage, not a cookie) &mdash; until you empty the
                cart, complete checkout, or clear browser storage.
              </li>
              <li>
                <code>cm_ref</code> (set by {site.parent}, read by Veyra at
                checkout) &mdash; up to 30 days, per {site.parent}&rsquo;s
                Partner Program Agreement.
              </li>
            </ul>
          ),
        },
        {
          heading: "Controlling cookies",
          body: (
            <p>
              You can delete or block cookies in your browser settings at any
              time. Blocking the sign-in cookie will prevent you from staying
              signed in; blocking the admin cookie will end an admin session;
              clearing local storage empties your cart; blocking the referral
              cookie simply means no partner gets credited for a purchase you
              make. The site remains readable and functional for browsing and
              buying in every case.
            </p>
          ),
        },
        {
          heading: "Related policies",
          body: (
            <p>
              This Cookie Policy is part of a set: our{" "}
              <a
                href="/privacy"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Privacy Policy
              </a>{" "}
              describes what personal data we collect; our{" "}
              <a
                href="/terms"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Terms of Service
              </a>{" "}
              set out the general rules for using the site; and our{" "}
              <a
                href="/refund-policy"
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Refund Policy
              </a>{" "}
              covers how refunds work. The {site.parent} Partner Program
              Agreement at <code>caelmont.in/partners/terms</code> governs
              how referral attribution is credited and paid.
            </p>
          ),
        },
        {
          heading: "Changes to this policy",
          body: (
            <p>
              If the set of cookies we use changes, we&rsquo;ll update the date
              above and, where the change affects you directly, tell you before
              it takes effect.
            </p>
          ),
        },
      ]}
    />
  );
}
