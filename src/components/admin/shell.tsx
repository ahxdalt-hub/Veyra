"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLocalStorageState } from "@/lib/use-local-storage";
import { useCcTheme } from "@/components/admin/theme";
import { useLenisScroll } from "@/components/admin/smooth-scroll";
import { SunIcon, MoonIcon } from "@/components/admin/icons";
import {
  OverviewIcon,
  OrdersIcon,
  CustomersIcon,
  ProductsIcon,
  LicencesIcon,
  PaymentsIcon,
  DownloadsIcon,
  AnalyticsIcon,
  CouponsIcon,
  ActivityIcon,
  SettingsIcon,
  PanelIcon,
  ExternalIcon,
  LogoutIcon,
} from "@/components/admin/icons";

/**
 * The command-center shell: a collapsible left rail (COMMAND / COMMERCE /
 * PRODUCTS / INTELLIGENCE / SYSTEM), a top bar carrying the page title,
 * global search + notifications (mounted by the shell host), and the
 * admin identity menu. Desktop-first; usable down to laptop widths.
 */

export type AdminIdentity = { id: string; email: string; full_name: string | null };

type NavItem = {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactNode;
  exact?: boolean;
};

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Command",
    items: [
      { href: "/admin", label: "Overview", icon: OverviewIcon, exact: true },
      { href: "/admin/activity", label: "Activity", icon: ActivityIcon },
    ],
  },
  {
    group: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders", icon: OrdersIcon },
      { href: "/admin/customers", label: "Customers", icon: CustomersIcon },
      { href: "/admin/payments", label: "Payments", icon: PaymentsIcon },
      { href: "/admin/coupons", label: "Coupons", icon: CouponsIcon },
    ],
  },
  {
    group: "Products",
    items: [
      { href: "/admin/products", label: "Products", icon: ProductsIcon },
      { href: "/admin/licences", label: "Licences", icon: LicencesIcon },
      { href: "/admin/downloads", label: "Downloads", icon: DownloadsIcon },
    ],
  },
  {
    group: "Intelligence",
    items: [{ href: "/admin/analytics", label: "Analytics", icon: AnalyticsIcon }],
  },
  {
    group: "System",
    items: [{ href: "/admin/settings", label: "Settings", icon: SettingsIcon }],
  },
];

const COLLAPSE_KEY = "veyra-cc-rail";

export function AdminShell({
  admin,
  children,
  topbarExtras,
}: {
  admin: AdminIdentity;
  children: React.ReactNode;
  /** Rendered in the top bar: search + notification center (page host). */
  topbarExtras?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const reduced = useReducedMotion();
  const [collapsedRaw, setCollapsedRaw] = useLocalStorageState(COLLAPSE_KEY, "0");
  const collapsed = collapsedRaw === "1";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  // Scroll state is written straight to the DOM in the scroll callback:
  // per-frame React state churn would re-render the whole shell on every
  // wheel tick. The callback keeps the last-known state in a ref and
  // only touches styles when it crosses thresholds.
  const scrolledRef = useRef(false);
  const { scrollToTop } = useLenisScroll(mainRef, (l) => {
    const progress = l.limit > 0 ? Math.min(1, l.scroll / l.limit) : 0;
    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${progress})`;
      progressRef.current.style.opacity = progress > 0.995 ? "0" : "1";
    }
    const nowScrolled = l.scroll > 8;
    if (nowScrolled !== scrolledRef.current) {
      scrolledRef.current = nowScrolled;
      if (headerRef.current) {
        headerRef.current.style.boxShadow = nowScrolled ? "var(--cc-shadow)" : "none";
      }
    }
  });

  const toggleCollapsed = useCallback(
    () => setCollapsedRaw(collapsed ? "0" : "1"),
    [collapsed, setCollapsedRaw]
  );

  // Route changes reset the scroll position and the top-edge state.
  useEffect(() => {
    scrollToTop(true);
    scrolledRef.current = false;
    if (headerRef.current) headerRef.current.style.boxShadow = "none";
    if (progressRef.current) progressRef.current.style.transform = "scaleX(0)";
  }, [pathname, scrollToTop]);

  // Close the identity menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function signOut() {
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } finally {
      router.replace("/admin/sign-in");
      router.refresh();
    }
  }

  const active = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--cc-bg)" }}>
      {/* — Left rail — */}
      <aside
        className="flex h-full shrink-0 flex-col border-r"
        style={{
          width: collapsed ? 60 : 232,
          borderColor: "var(--cc-line)",
          backgroundColor: "var(--cc-bg-2)",
          transition: reduced ? "none" : "width 0.28s var(--ease-out-soft)",
        }}
      >
        {/* Brand */}
        <Link
          href="/admin"
          className="flex h-14 shrink-0 items-center gap-2.5 overflow-hidden border-b px-4"
          style={{ borderColor: "var(--cc-line)" }}
        >
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border font-display text-sm italic"
            style={{ borderColor: "var(--cc-accent-line)", color: "var(--cc-accent-ink)" }}
          >
            V
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
                className="whitespace-nowrap text-sm font-medium tracking-tight"
                style={{ color: "var(--cc-text)" }}
              >
                Command Center
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Nav */}
        <nav className="no-scrollbar flex-1 overflow-y-auto py-4">
          {NAV.map((section, si) => (
            <div key={section.group} className={si > 0 ? "mt-6" : undefined}>
              {!collapsed && (
                <p className="cc-label mb-2 px-4" style={{ color: "var(--cc-text-4)" }}>
                  {section.group}
                </p>
              )}
              <ul className="space-y-px">
                {section.items.map((item) => {
                  const isActive = active(item);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className="group relative flex h-9 items-center gap-3 px-4 text-sm transition-colors duration-150"
                        style={{
                          color: isActive ? "var(--cc-text)" : "var(--cc-text-3)",
                          backgroundColor: isActive ? "var(--cc-surface-2)" : undefined,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = "var(--cc-surface)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = "";
                        }}
                      >
                        {/* active indicator: thin champagne edge, not a card */}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full"
                            style={{ backgroundColor: "var(--cc-accent)" }}
                          />
                        )}
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && (
                          <span className="truncate">{item.label}</span>
                        )}
                        {collapsed && (
                          /* tooltip on hover when rail is narrow */
                          <span
                            className="pointer-events-none absolute left-[52px] z-50 hidden whitespace-nowrap rounded-sm border px-2 py-1 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 xl:block"
                            style={{
                              backgroundColor: "var(--cc-surface)",
                              borderColor: "var(--cc-line-strong)",
                              color: "var(--cc-text)",
                            }}
                          >
                            {item.label}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse control */}
        <div className="shrink-0 border-t p-2" style={{ borderColor: "var(--cc-line)" }}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-full items-center justify-center gap-2 rounded-sm text-xs transition-colors"
            style={{ color: "var(--cc-text-3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--cc-surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
          >
            <PanelIcon className="h-4 w-4" />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* — Main column — */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          ref={headerRef}
          className="flex h-14 shrink-0 items-center gap-4 border-b px-5"
          style={{
            borderColor: "var(--cc-line)",
            backgroundColor: "var(--cc-bg)",
            boxShadow: "none",
            transition: "box-shadow 0.25s var(--ease-out-soft)",
            position: "relative",
            zIndex: 5,
          }}
        >
          <RouteTitle pathname={pathname} />
          <div className="min-w-0 flex-1">{topbarExtras}</div>

          <ThemeToggle />

          <Link
            href="/"
            target="_blank"
            className="flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-xs transition-colors"
            style={{ borderColor: "var(--cc-line-strong)", color: "var(--cc-text-3)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--cc-text)";
              e.currentTarget.style.borderColor = "var(--cc-accent-line)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--cc-text-3)";
              e.currentTarget.style.borderColor = "var(--cc-line-strong)";
            }}
          >
            <ExternalIcon className="h-3.5 w-3.5" />
            View site
          </Link>

          {/* Identity menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-8 items-center gap-2 rounded-sm pl-1 pr-2 text-sm transition-colors"
              style={{ color: "var(--cc-text-2)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--cc-surface-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium uppercase"
                style={{ backgroundColor: "var(--cc-accent-dim)", color: "var(--cc-accent-ink)" }}
              >
                {(admin.full_name ?? admin.email).slice(0, 2)}
              </span>
              <span className="hidden max-w-[140px] truncate md:block">
                {admin.full_name ?? admin.email}
              </span>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  role="menu"
                  initial={reduced ? false : { opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-md border shadow-xl"
                  style={{
                    backgroundColor: "var(--cc-surface)",
                    borderColor: "var(--cc-line-strong)",
                  }}
                >
                  <div className="border-b px-4 py-3" style={{ borderColor: "var(--cc-line)" }}>
                    <p className="truncate text-sm font-medium" style={{ color: "var(--cc-text)" }}>
                      {admin.full_name ?? "Administrator"}
                    </p>
                    <p className="mt-0.5 truncate text-xs" style={{ color: "var(--cc-text-3)" }}>
                      {admin.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void signOut()}
                    className="flex h-10 w-full items-center gap-2.5 px-4 text-sm transition-colors"
                    style={{ color: "var(--cc-text-2)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--cc-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
                  >
                    <LogoutIcon className="h-4 w-4" />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page surface */}
        {/* Page surface — Lenis momentum-scrolls this container. A thin
            champagne progress hairline under the header reads position;
            the header lifts on a soft shadow once scrolled. */}
        <div className="relative h-0 shrink-0" aria-hidden="true">
          <div
            ref={progressRef}
            className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full origin-left"
            style={{
              background:
                "linear-gradient(90deg, var(--cc-accent), var(--cc-accent-ink))",
              transform: "scaleX(0)",
              opacity: 0,
              transition: "opacity 0.3s ease",
            }}
          />
        </div>
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          {/* Stable content node for Lenis (it binds firstElementChild once).
              Inside it, a per-route soft mount transition: the page eases
              in as new data arrives — quick rise, no exit theatrics. */}
          <div>
            <motion.div
              key={pathname}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto w-full max-w-[86rem] px-5 py-6 lg:px-7"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* — Top-bar pieces — */

const TITLES: Record<string, string> = {
  "": "Overview",
  activity: "Activity",
  orders: "Orders",
  customers: "Customers",
  payments: "Payments",
  coupons: "Coupons",
  products: "Products",
  licences: "Licences",
  downloads: "Downloads",
  analytics: "Analytics",
  settings: "Settings",
};

function RouteTitle({ pathname }: { pathname: string }) {
  const segments = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  const root = segments[0] ?? "";
  const title = TITLES[root] ?? "Command Center";
  const detail =
    segments.length > 1 ? segments[segments.length - 1].slice(0, 8).toUpperCase() : null;
  return (
    <div className="flex shrink-0 items-baseline gap-2.5">
      <span className="text-sm font-medium tracking-tight" style={{ color: "var(--cc-text)" }}>
        {title}
      </span>
      {detail ? (
        <span className="font-mono text-[10px]" style={{ color: "var(--cc-text-4)" }}>
          / {detail}
        </span>
      ) : null}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useCcTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
      className="flex h-8 w-8 items-center justify-center rounded-sm transition-colors"
      style={{ color: "var(--cc-text-3)" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--cc-surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
    >
      {theme === "dark" ? <SunIcon className="h-[17px] w-[17px]" /> : <MoonIcon className="h-[17px] w-[17px]" />}
    </button>
  );
}
