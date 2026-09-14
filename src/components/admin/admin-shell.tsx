"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AdminGridIcon,
  AdminOrdersIcon,
  AdminUsersIcon,
  AdminBoxIcon,
  AdminKeyIcon,
  AdminCardIcon,
  AdminTruckIcon,
  AdminChartIcon,
  AdminBellIcon,
  AdminCogIcon,
  AdminLogoutIcon,
  AdminSearchIcon,
  AdminCloseIcon,
  AdminLockIcon,
} from "./admin-icons";
import { adminLogoutAction } from "@/app/admin/actions";

/**
 * AdminShell — the persistent command-center chrome: sidebar (business
 * operations vs system), topbar (search, notifications, sign out), and
 * the main scroll region. Desktop-first information density; the sidebar
 * collapses to a slide-over on mobile.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type NavEntry = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactElement;
};

const businessNav: NavEntry[] = [
  { href: "/admin", label: "Command Center", icon: AdminGridIcon },
  { href: "/admin/orders", label: "Orders", icon: AdminOrdersIcon },
  { href: "/admin/customers", label: "Customers", icon: AdminUsersIcon },
  { href: "/admin/products", label: "Products", icon: AdminBoxIcon },
  { href: "/admin/licences", label: "Licences", icon: AdminKeyIcon },
  { href: "/admin/payments", label: "Payments", icon: AdminCardIcon },
  { href: "/admin/delivery", label: "Delivery", icon: AdminTruckIcon },
  { href: "/admin/analytics", label: "Analytics", icon: AdminChartIcon },
];

const systemNav: NavEntry[] = [
  { href: "/admin/notifications", label: "Notifications", icon: AdminBellIcon },
  { href: "/admin/settings", label: "Settings", icon: AdminCogIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarContent({
  onNavigate,
  unreadCount,
}: {
  onNavigate?: () => void;
  unreadCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex h-full flex-col">
      {/* Brand */}
      <Link
        href="/admin"
        onClick={onNavigate}
        className="group flex items-center gap-3 border-b border-cc-line px-5 py-4"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-cc-accent/40 bg-cc-accent-soft">
          <span className="font-display text-sm font-semibold text-cc-accent">
            V
          </span>
        </span>
        <span>
          <span className="block font-display text-[0.9375rem] font-medium leading-tight text-cc-text">
            Veyra
          </span>
          <span className="spec block text-cc-text-4">Command Center</span>
        </span>
      </Link>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-cc-text-4">
          Business Operations
        </p>
        <ul className="space-y-0.5">
          {businessNav.map((entry) => {
            const active = isActive(pathname, entry.href);
            const Icon = entry.icon;
            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-3 rounded-sm px-2.5 py-2 text-[0.8125rem] transition-colors ${
                    active
                      ? "bg-cc-panel-2 font-medium text-cc-text"
                      : "text-cc-text-3 hover:bg-cc-panel hover:text-cc-text-2"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="admin-nav-active"
                      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-cc-accent"
                      transition={{ duration: 0.25, ease: EASE }}
                    />
                  ) : null}
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-cc-accent" : ""
                    }`}
                  />
                  {entry.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="px-2 pb-2 pt-5 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-cc-text-4">
          System
        </p>
        <ul className="space-y-0.5">
          {systemNav.map((entry) => {
            const active = isActive(pathname, entry.href);
            const Icon = entry.icon;
            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-3 rounded-sm px-2.5 py-2 text-[0.8125rem] transition-colors ${
                    active
                      ? "bg-cc-panel-2 font-medium text-cc-text"
                      : "text-cc-text-3 hover:bg-cc-panel hover:text-cc-text-2"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="admin-nav-active"
                      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-cc-accent"
                      transition={{ duration: 0.25, ease: EASE }}
                    />
                  ) : null}
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-cc-accent" : ""
                    }`}
                  />
                  {entry.label}
                  {entry.href === "/admin/notifications" && unreadCount > 0 ? (
                    <span
                      aria-label={`${unreadCount} unread`}
                      className="ml-auto inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-cc-accent px-1 text-[0.625rem] font-semibold leading-none text-cc-bg"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sign out */}
      <form action={adminLogoutAction} className="border-t border-cc-line p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-[0.8125rem] text-cc-text-3 transition-colors hover:bg-cc-panel hover:text-cc-bad"
        >
          <AdminLogoutIcon className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </form>
    </nav>
  );
}

export function AdminShell({
  children,
  unreadCount,
  searchSlot,
  notificationsSlot,
}: {
  children: React.ReactNode;
  unreadCount: number;
  searchSlot: React.ReactNode;
  notificationsSlot: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const lastPath = useRef(pathname);

  // Close the mobile nav when the route changes (deferred — comparing
  // inside the subscription, not resetting synchronously on mount).
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setMobileNavOpen(false);
    }
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-cc-bg text-cc-text">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 border-r border-cc-line bg-cc-panel/60 lg:block">
        <SidebarContent unreadCount={unreadCount} />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileNavOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.2 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-60 border-r border-cc-line bg-cc-panel lg:hidden"
              initial={reduced ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <button
                type="button"
                aria-label="Close navigation"
                className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-sm text-cc-text-3 hover:bg-cc-panel-2 hover:text-cc-text"
                onClick={() => setMobileNavOpen(false)}
              >
                <AdminCloseIcon />
              </button>
              <SidebarContent
                unreadCount={unreadCount}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-cc-line bg-cc-bg/90 px-4 backdrop-blur-sm sm:px-6">
          {/* Mobile nav trigger */}
          <button
            type="button"
            aria-label="Open navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-cc-line text-cc-text-2 hover:border-cc-line-strong lg:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4" aria-hidden="true">
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
          </button>

          <p className="spec hidden text-cc-text-4 md:block">
            Internal System · Restricted
          </p>

          <div className="ml-auto flex items-center gap-2">
            {searchSlot}
            {notificationsSlot}
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <footer className="border-t border-cc-line px-6 py-3">
          <p className="spec text-cc-text-4">
            Veyra Command Center · Caelmont
          </p>
        </footer>
      </div>
    </div>
  );
}

export { AdminSearchIcon, AdminLockIcon };
