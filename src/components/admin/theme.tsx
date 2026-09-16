"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useLocalStorageState } from "@/lib/use-local-storage";

/**
 * Command-center theme.
 *
 * Dark is the default — the control-room register the whole system is
 * designed for; light is the warm-ivory variant. The preference lives
 * in localStorage (a personal workspace setting, deliberately not in
 * the database), read through useSyncExternalStore so there are no
 * hydration mismatches or effect cascades. The .cc class carries the
 * CSS custom properties (src/app/admin/admin.css); toggling .cc-light
 * switches registers, and the html element carries the matching class
 * so overscroll areas stay in theme.
 */

export type CcTheme = "dark" | "light";
const STORAGE_KEY = "veyra-cc-theme";

const ThemeCtx = createContext<{ theme: CcTheme; toggle: () => void }>({
  theme: "dark",
  toggle: () => undefined,
});

export function CcThemeProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useLocalStorageState(STORAGE_KEY, "dark");
  const theme: CcTheme = raw === "light" ? "light" : "dark";

  // The html element mirrors the theme for background bleed (overscroll,
  // dialogs' backdrop). DOM sync in an effect is the correct use here.
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("cc-html");
    el.classList.toggle("cc-light", theme === "light");
    el.style.backgroundColor = theme === "light" ? "#f4f1ea" : "#131210";
    return () => {
      el.classList.remove("cc-html", "cc-light");
      el.style.backgroundColor = "";
    };
  }, [theme]);

  const toggle = useCallback(
    () => setRaw(theme === "dark" ? "light" : "dark"),
    [setRaw, theme]
  );

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return (
    <ThemeCtx.Provider value={value}>
      <div
        className={`cc min-h-screen${theme === "light" ? " cc-light" : ""}`}
        style={{
          backgroundColor: "var(--cc-bg)",
          color: "var(--cc-text)",
          transition:
            "background-color 0.35s var(--ease-out-soft), color 0.35s var(--ease-out-soft)",
        }}
      >
        {children}
      </div>
    </ThemeCtx.Provider>
  );
}

export function useCcTheme() {
  return useContext(ThemeCtx);
}
