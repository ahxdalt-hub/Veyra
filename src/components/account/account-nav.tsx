"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DocIcon,
  LayersIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/ui/icons";

/**
 * Account navigation — a numbered directory. Sidebar on desktop (each
 * section carries a one-line description so the account reads as a set
 * of distinct places to explore), scrollable tab row on mobile.
 * Active state follows the pathname; links are real anchors so keyboard
 * and middle-click behavior stay native.
 */

const items = [
  {
    label: "Overview",
    href: "/account",
    icon: UserIcon,
    description: "Everything at a glance",
    exact: true,
  },
  {
    label: "Orders",
    href: "/account/orders",
    icon: DocIcon,
    description: "Purchases & receipts",
    exact: false,
  },
  {
    label: "Your products",
    href: "/account/library",
    icon: LayersIcon,
    description: "Systems you own",
    exact: false,
  },
  {
    label: "Licences",
    href: "/account/licences",
    icon: ShieldIcon,
    description: "Permits & references",
    exact: false,
  },
  {
    label: "Settings",
    href: "/account/settings",
    icon: SettingsIcon,
    description: "Profile & preferences",
    exact: false,
  },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account">
      {/* Mobile: scrollable tab row */}
      <ul
        className="flex gap-1 overflow-x-auto pb-1 lg:hidden"
        role="list"
      >
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-2.5 whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "text-ink"
                    : "text-ink-3 hover:text-ink hover:bg-accent-soft/60"
                }`}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-sm border border-line bg-paper shadow-xs"
                  />
                ) : null}
                <item.icon className="relative h-4 w-4 text-accent" />
                <span className="relative">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Desktop: numbered directory */}
      <ul className="hidden flex-col lg:flex" role="list">
        <li className="mb-3 border-b border-line pb-2">
          <span className="text-eyebrow">Account index</span>
        </li>
        {items.map((item, i) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex gap-3 rounded-sm border px-3 py-2.5 transition-colors duration-200 ${
                  active
                    ? "border-line bg-paper shadow-xs"
                    : "border-transparent hover:bg-accent-soft/60"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`spec tnum pt-0.5 transition-colors duration-200 ${
                    active ? "text-accent" : "text-ink-4 group-hover:text-ink-3"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span
                    className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                      active ? "text-ink" : "text-ink-2 group-hover:text-ink"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-accent" />
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink-4">
                    {item.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
