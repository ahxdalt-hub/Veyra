"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { primaryNav, site } from "@/lib/site";
import { useCart } from "@/components/cart/cart-context";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useSearch } from "@/components/search/search-context";
import { SearchDialogHost } from "@/components/search/search-dialog";
import {
  CartIcon,
  CloseIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@/components/ui/icons";

/**
 * Header — sticky, scroll-aware.
 * Hairline + backdrop blur appear after 8px of scroll. Mobile drawer is
 * a full-height panel with the complete nav — focusable, Escape-closable.
 */

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { count, openCart } = useCart();
  const { open: openSearch } = useSearch();
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const lastPath = useRef(pathname);

  // Scroll state — passive listener, rAF-throttled.
  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        ticking = false;
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change.
  useEffect(() => {
    if (lastPath.current !== pathname) {
      setMenuOpen(false);
      lastPath.current = pathname;
    }
  }, [pathname]);

  // Escape closes mobile menu; lock scroll while open.
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const isActive = (href: string) => {
    const base = href.split("#")[0];
    if (base === "/") return pathname === "/";
    return pathname.startsWith(base);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-80 transition-[background-color,border-color] duration-300 ${
          scrolled
            ? "border-b border-line bg-paper/85 backdrop-blur-md"
            : "border-b border-transparent bg-paper"
        }`}
      >
        <div className="container-page flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]">
          {/* Brand */}
          <Link
            href="/"
            className="group flex items-baseline gap-2"
            aria-label={`${site.name} — home`}
          >
            <span className="font-display text-[1.35rem] font-semibold leading-none tracking-[-0.02em] text-ink">
              Standard
            </span>
            <span className="font-display text-[1.35rem] font-light italic leading-none tracking-[-0.02em] text-accent">
              Practice
            </span>
            <span className="ml-1 hidden h-1.5 w-1.5 rounded-full bg-amber transition-transform duration-300 group-hover:scale-125 sm:block" />
          </Link>

          {/* Desktop nav */}
          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 lg:flex"
          >
            {primaryNav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    active ? "text-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {item.label}
                  {active ? (
                    <motion.span
                      layoutId={reduced ? undefined : "nav-active"}
                      className="absolute inset-x-3 -bottom-px h-0.5 bg-accent"
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openSearch}
              className="hidden h-10 items-center gap-2.5 rounded-sm border border-line-strong bg-surface/60 px-3 text-sm text-ink-3 transition-colors duration-200 hover:border-ink/25 hover:text-ink md:flex"
              aria-label="Search products"
            >
              <SearchIcon />
              <span>Search</span>
              <kbd className="spec ml-3 rounded-xs border border-line bg-paper px-1.5 py-0.5 text-ink-4">
                Ctrl K
              </kbd>
            </button>
            <button
              type="button"
              onClick={openSearch}
              className="rounded-sm p-2.5 text-ink-2 transition-colors hover:bg-accent-soft hover:text-ink md:hidden"
              aria-label="Search products"
            >
              <SearchIcon />
            </button>

            <Link
              href="/account"
              aria-label="Account"
              className="rounded-sm p-2.5 text-ink-2 transition-colors hover:bg-accent-soft hover:text-ink"
            >
              <UserIcon />
            </Link>

            <button
              type="button"
              onClick={openCart}
              className="relative rounded-sm p-2.5 text-ink-2 transition-colors hover:bg-accent-soft hover:text-ink"
              aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <CartIcon />
              {count > 0 ? (
                <motion.span
                  key={count}
                  initial={reduced ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-accent text-[0.625rem] font-semibold text-white tnum"
                >
                  {count}
                </motion.span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-sm p-2.5 text-ink-2 transition-colors hover:bg-accent-soft hover:text-ink lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      <SearchDialogHost />
      <CartDrawer />
      <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

/** Mobile drawer — full nav with descriptions, accessible. */
function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduced = useReducedMotion();
  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-70 lg:hidden">
        <motion.button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-ink/25"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          onClick={onClose}
        />
        <motion.div
          id="mobile-nav"
          className="absolute inset-x-0 bottom-0 top-16 overflow-y-auto border-t border-line bg-paper"
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{
            duration: reduced ? 0 : 0.32,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <nav aria-label="Mobile" className="container-page py-6">
            <ul className="divide-y divide-line border-y border-line">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="group flex items-center justify-between py-4 pr-2"
                  >
                    <span>
                      <span className="block text-base font-medium text-ink">
                        {item.label}
                      </span>
                      {item.description ? (
                        <span className="mt-0.5 block text-xs text-ink-3">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                    <svg
                      viewBox="0 0 16 16"
                      className="h-4 w-4 text-ink-4 transition-colors group-hover:text-accent"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 8h11.5M9 3.5 13.5 8 9 12.5" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/contact"
                onClick={onClose}
                className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline"
              >
                Contact
              </Link>
              <p className="max-w-md text-xs leading-relaxed text-ink-3">
                {site.positioning}
              </p>
            </div>
          </nav>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
