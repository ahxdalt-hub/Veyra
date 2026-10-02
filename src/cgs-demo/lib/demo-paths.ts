/**
 * Route helpers for the web demo. The desktop app owns absolute paths like
 * "/acquire/outreach"; every link and router call in the demo passes through
 * dHref() so it resolves under the demo route, and relPath() maps a browser
 * pathname back to the desktop app's shape for active-state comparisons.
 */

export const CGS_BASE = "/demo/client-growth-system";

export function dHref(path: string): string {
  if (path === "/") return CGS_BASE;
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  return CGS_BASE + trimmed;
}

export function relPath(pathname: string | null): string {
  if (!pathname) return "/";
  const base = pathname === CGS_BASE ? "/" : pathname.startsWith(CGS_BASE + "/") ? pathname.slice(CGS_BASE.length) : pathname;
  return base !== "/" && base.endsWith("/") ? base.slice(0, -1) : base;
}
