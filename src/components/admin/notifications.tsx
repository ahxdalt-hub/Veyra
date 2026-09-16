"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { AdminNotificationRow } from "@/lib/supabase/types";

/**
 * NotificationProvider — the command center's live nervous system.
 *
 * Source of truth: the admin_notifications table, delivered through
 * Supabase Realtime (postgres_changes INSERT). No polling: the DB pushes
 * to admin sessions only — RLS ("admin reads notifications", gated by
 * is_admin()) gates the subscription itself, so a customer socket
 * receives nothing even if it subscribed to the table.
 *
 * Behavior the spec demands, honored here:
 *  - New verified sales surface as toasts the moment the server inserts
 *    the row (the verify route / webhook writes it with product name and
 *    amount resolved server-side).
 *  - Rapid events STACK independently and reposition smoothly as older
 *    ones dismiss (handled by <ToastStack/> with layout animations).
 *  - After a (re)connect, recent unread rows are re-pulled so events
 *    that arrived during a socket gap are never missed; deduped by id.
 *  - Read/unread updates go through /api/admin/notifications — the
 *    browser key can UPDATE nothing directly (RLS: no write policies).
 */

export type Toast = AdminNotificationRow;

type NotifCtx = {
  unread: number;
  recent: AdminNotificationRow[];
  toasts: Toast[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismissToast: (id: string) => void;
  openToast: (row: Toast) => void;
  refresh: () => void;
};

const Ctx = createContext<NotifCtx | null>(null);
const TOAST_TTL_MS = 8000;
/** Sale toasts are deliberately brief: slide in, hold ~2.5s, slide out. */
const SALE_TTL_MS = 2500;
const TOAST_MAX = 4;
const RESYNC_WINDOW_HOURS = 6;

/** Where a notification links — derived from related_entity/id written
 *  by the server at event time. Always an admin route. */
export function notificationLink(row: AdminNotificationRow): string {
  switch (row.kind) {
    case "sale":
    case "payment_failed":
      return row.related_id ? `/admin/orders/${row.related_id}` : "/admin/orders";
    case "customer":
      return "/admin/customers";
    case "licence":
      return row.related_id ? `/admin/licences?focus=${row.related_id}` : "/admin/licences";
    case "coupon":
      return "/admin/coupons";
    case "delivery":
      return "/admin/downloads";
    default:
      return "/admin/activity";
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<AdminNotificationRow[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // All mutable bookkeeping lives in refs touched only inside callbacks
  // and effects (never during render).
  const seenIds = useRef<Set<string>>(new Set());
  const unreadIds = useRef<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const unreadBase = useRef(0); // live total; +N on push, -1 on read

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const pushToast = useCallback(
    (row: AdminNotificationRow) => {
      if (seenIds.current.has(row.id)) return;
      seenIds.current.add(row.id);
      setToasts((t) => [row, ...t].slice(0, TOAST_MAX));
      const id = row.id;
      // Sales are a light "heads up" — slide in, breathe, slide out.
      // Operational toasts (failures etc.) stay longer.
      const ttl = row.kind === "sale" ? SALE_TTL_MS : TOAST_TTL_MS;
      const timer = setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
        timers.current.delete(id);
      }, ttl);
      timers.current.set(id, timer);
      setRecent((r) => [row, ...r].slice(0, 40));
      if (!row.read_at) {
        unreadIds.current.add(row.id);
        unreadBase.current += 1;
        setUnread(unreadBase.current);
      }
    },
    []
  );

  const loadCenter = useCallback(() => {
    void fetch("/api/admin/notifications", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { notifications: AdminNotificationRow[]; unread: number } | null) => {
        if (!data) return;
        unreadBase.current = data.unread ?? 0;
        setUnread(data.unread ?? 0);
        setRecent(data.notifications ?? []);
        unreadIds.current = new Set(
          data.notifications?.filter((n) => !n.read_at).map((n) => n.id) ?? []
        );
        for (const n of data.notifications ?? []) seenIds.current.add(n.id);
      })
      .catch(() => null);
  }, []);

  /* --- Realtime subscription — one, for the provider's lifetime ------
   * With a quiet fallback: environments that block websockets (locked
   *-down webviews, strict networks) would otherwise miss live events
   * entirely, so while the channel isn't SUBSCRIBED a gentle interval
   * re-pulls recent rows. It's not aggressive polling — it's what keeps
   * the promise "the admin does not miss activity" when realtime can't
   * reach the client. Realtime is preferred the moment it connects. */
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return;

    let active = true;
    let subscribed = false;
    const client = createBrowserClient(url, anon);
    loadCenter();

    const resync = () => {
      const since = new Date(Date.now() - RESYNC_WINDOW_HOURS * 3600_000).toISOString();
      void fetch(`/api/admin/notifications?since=${encodeURIComponent(since)}`, {
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { notifications: AdminNotificationRow[] } | null) => {
          if (!active || !data?.notifications) return;
          const fresh = data.notifications.filter((n) => !seenIds.current.has(n.id));
          // Toast only the newest few — the rest wait in the center.
          for (const n of fresh.slice(0, TOAST_MAX)) pushToast(n);
        })
        .catch(() => null);
    };

    const channel = client
      .channel("cc-admin-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          if (active) pushToast(payload.new as AdminNotificationRow);
        }
      )
      .subscribe((status) => {
        subscribed = status === "SUBSCRIBED";
        // (Re)connected: heal any events missed while the socket was down.
        if (subscribed && active) resync();
      });

    const fallback = setInterval(() => {
      if (active && !subscribed) resync();
    }, 25_000);

    return () => {
      active = false;
      clearInterval(fallback);
      void client.removeChannel(channel);
    };
  }, [pushToast, loadCenter]);

  // Sweep toast timers when the provider unmounts.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const markRead = useCallback((id: string) => {
    const wasUnread = unreadIds.current.delete(id);
    setRecent((r) =>
      r.map((n) =>
        n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
    if (wasUnread && unreadBase.current > 0) {
      unreadBase.current -= 1;
      setUnread(unreadBase.current);
    }
    void fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => null);
  }, []);

  const markAllRead = useCallback(() => {
    unreadBase.current = 0;
    unreadIds.current = new Set();
    setUnread(0);
    const now = new Date().toISOString();
    setRecent((r) => r.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    void fetch("/api/admin/notifications", { method: "PATCH" }).catch(() => null);
  }, []);

  const openToast = useCallback(
    (row: Toast) => {
      dismissToast(row.id);
      markRead(row.id);
      router.push(notificationLink(row));
    },
    [dismissToast, markRead, router]
  );

  const value = useMemo<NotifCtx>(
    () => ({
      unread,
      recent,
      toasts,
      markRead,
      markAllRead,
      dismissToast,
      openToast,
      refresh: loadCenter,
    }),
    [unread, recent, toasts, markRead, markAllRead, dismissToast, openToast, loadCenter]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotifCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
