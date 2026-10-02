"use client";

/**
 * Command palette (⌘K / Ctrl+K) — the desktop habit that makes a local app
 * feel like one. Searches every record in the workspace and jumps straight
 * to it; also offers the stage routes as quick navigation.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CornerDownLeft, Search } from "lucide-react";
import { useStore } from "@/cgs-demo/lib/store";
import { STAGES } from "@/cgs-demo/lib/stages";
import { SearchResult, searchWorkspace } from "@/cgs-demo/lib/search";
import { dHref } from "@/cgs-demo/lib/demo-paths";

interface Command {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  href: string;
  score: number;
}

const NAV_COMMANDS: Command[] = [
  { id: "nav-dashboard", kind: "Go to", title: "Dashboard", subtitle: "What should I do next?", href: "/", score: -1 },
  ...STAGES.flatMap((s) => [
    ...(s.modules.length > 0
      ? s.modules.map((m) => ({ id: `nav-${m.id}`, kind: "Go to", title: m.title, subtitle: `${s.label} · Build module`, href: m.href, score: -1 }))
      : s.nav?.map((n) => ({ id: `nav-${s.id}-${n.id}`, kind: "Go to", title: n.label, subtitle: `${s.number} · ${s.label}`, href: n.href, score: -1 })) ?? []),
  ]),
  { id: "nav-settings", kind: "Go to", title: "Settings", subtitle: "Workspace · backup · reset", href: "/settings", score: -1 },
];

export function CommandPalette() {
  const { data } = useStore();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Hydration guard for the portal: false on the server, true in the browser.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSel(0);
  }, []);


  const results = useMemo<Command[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const hits: SearchResult[] = searchWorkspace(data, q, 10);
    const found: Command[] = hits.map((h) => ({ id: h.id, kind: h.kind, title: h.title, subtitle: h.subtitle, href: h.href, score: h.score }));
    const nq = q.toLowerCase();
    const navs = NAV_COMMANDS.filter((c) => c.title.toLowerCase().includes(nq));
    return [...found, ...navs];
  }, [data, query]);

  const go = (c: Command) => {
    close();
    router.push(dHref(c.href));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    }
    if (e.key === "Enter" && results[sel]) go(results[sel]!);
  };

  useEffect(() => {
    listRef.current?.children[sel]?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  return (
    <>
      {/* Trigger in the top bar */}
      <button
        type="button"
        onClick={(e) => {
          // Drop focus so the header button keeps no focus ring while the
          // palette is open (keyboard users tabbing in still get the ring).
          e.currentTarget.blur();
          setOpen(true);
        }}
        aria-label="Open search (Ctrl+K)"
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 text-[12.5px] text-cgs-faint transition-colors hover:border-cgs-faint hover:text-cgs-muted"
      >
        <Search size={13} aria-hidden />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-cgs-line bg-cgs-inset px-1 py-px text-[10px] font-medium text-cgs-muted sm:inline" aria-hidden>
          Ctrl K
        </kbd>
      </button>

      {/* The overlay is portaled to <body> so the header's backdrop-blur
          (which creates a containing block for fixed elements) can't trap it
          inside the 51px header strip. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Search the workspace">
                <div
                  className="absolute inset-0"
                  onClick={close}
                />
                <motion.div
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  className="absolute left-1/2 top-[20%] w-[min(600px,92vw)] -translate-x-1/2 overflow-hidden rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-pop"
                >
                  <div className="flex items-center gap-2.5 border-b border-cgs-line px-4">
                    <Search size={15} className="shrink-0 text-cgs-faint" aria-hidden />
                    <input
                      ref={inputRef}
                      autoFocus
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSel(0);
                      }}
                      onKeyDown={onKeyDown}
                      placeholder="Search prospects, clients, deals, onboarding, reviews…  (Esc closes)"
                      aria-label="Search query"
                      className="h-12 flex-1 bg-transparent text-[14px] text-cgs-ink placeholder:text-cgs-faint focus:outline-none focus-visible:outline-none!"
                    />
                  </div>
                  {query.trim().length > 0 && query.trim().length < 2 && (
                    <p className="px-4 py-2 text-[12px] text-cgs-faint">Keep typing — two characters start the search.</p>
                  )}
                  <ul ref={listRef} className="max-h-[50vh] overflow-y-auto py-1.5" role="listbox" aria-label="Search results">
                    {results.map((c, i) => (
                      <li key={c.id} role="option" aria-selected={i === sel}>
                        <button
                          type="button"
                          onMouseEnter={() => setSel(i)}
                          onClick={() => go(c)}
                          className={`flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] ${i === sel ? "bg-cgs-accent-faint" : "hover:bg-cgs-inset/60"}`}
                        >
                          <span className={`w-20 shrink-0 truncate text-[10.5px] font-semibold uppercase tracking-[0.08em] ${c.kind === "Go to" ? "text-cgs-faint" : "text-cgs-accent/80"}`}>
                            {c.kind}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate ${i === sel ? "font-medium text-cgs-ink" : "text-cgs-ink-soft"}`}>{c.title}</span>
                            <span className="block truncate text-[11.5px] text-cgs-faint">{c.subtitle}</span>
                          </span>
                          {i === sel && <CornerDownLeft size={12} className="shrink-0 text-cgs-accent" aria-hidden />}
                        </button>
                      </li>
                    ))}
                    {results.length === 0 && query.trim().length >= 2 && (
                      <li className="px-4 py-6 text-center text-[12.5px] text-cgs-muted">
                        Nothing matches “{query.trim()}” across prospects, companies, opportunities, proposals,
                        clients, onboarding or reviews.
                      </li>
                    )}
                    {results.length === 0 && query.trim().length < 2 && (
                      <li className="px-4 py-6 text-center text-[12.5px] text-cgs-faint">
                        Type to search everything in the workspace — or jump to a stage page.
                      </li>
                    )}
                  </ul>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
