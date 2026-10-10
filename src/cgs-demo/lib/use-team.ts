"use client";

/**
 * useTeam — live Team-workspace wiring over Supabase Realtime.
 *
 * The personal workspace is local-first and never leaves the machine; this
 * hook powers the SEPARATE, opt-in Team workspace (migration 0030). It:
 *   - resolves the caller's `client-growth-system` entitlement (owner or
 *     active seat) — the security boundary RLS enforces server-side;
 *   - opens a Realtime channel keyed by that entitlement and tracks presence
 *     (who's online) + a broadcast for transient "X is editing Y" pulses;
 *   - subscribes to the shared document and the team chat.
 *
 * In the read-only web demo there is no real session, so the hook resolves
 * to `available: false` and touches nothing — it is a strict no-op there.
 * All failure modes fail closed (never throw into render).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseAuthConfigured } from "@/lib/supabase/config";
import type { TeamMessageRow } from "@/lib/supabase/types";
import { isLive, type TeamMessage, type Teammate } from "@/cgs-demo/lib/team";

const PRODUCT_SLUG = "client-growth-system";

/** Stable per-session participant key so presence de-dupes this device. */
function deviceId(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "veyra:team:device";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `d-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    return "ephemeral";
  }
}

export type TeamState = {
  /** False in the demo or when Supabase/session is unavailable. */
  available: boolean;
  /** True once the presence socket is subscribed. */
  connected: boolean;
  /** Live teammates (excluding this device), newest heartbeat first. */
  teammates: Teammate[];
  /** Team chat, oldest first. */
  messages: TeamMessage[];
  /** The shared workspace document (v1 shape), or null until loaded. */
  shared: Record<string, unknown> | null;
  /** Announce what this user is editing (pass null when idle). */
  setEditing: (label: string | null) => void;
  /** Send a chat line (no-op when unavailable). */
  sendMessage: (body: string) => void;
  /** Persist the shared document (no-op when unavailable). */
  saveShared: (data: Record<string, unknown>) => void;
  /** This device's own email (for labelling own messages). */
  selfEmail: string | null;
};

type TeamChannel = ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]>;

export function useTeam(): TeamState {
  const [available, setAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [shared, setShared] = useState<Record<string, unknown> | null>(null);
  const [selfEmail, setSelfEmail] = useState<string | null>(null);

  const me = useMemo(() => deviceId(), []);
  const channelRef = useRef<TeamChannel | null>(null);
  useEffect(() => {
    if (!supabaseAuthConfigured()) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) return; // demo / signed out → stays unavailable, no-op.

        // Resolve this user's entitlement for the product — as owner OR as an
        // active seat. RLS makes any other licence's rows invisible, so a
        // match here is by definition one the caller legitimately belongs to.
        const { data: seats } = await supabase
          .from("seat_assignments")
          .select("entitlement_id, email")
          .eq("user_id", user.id)
          .eq("status", "active");
        const { data: owned } = await supabase
          .from("entitlements")
          .select("id, email")
          .eq("user_id", user.id)
          .eq("product_slug", PRODUCT_SLUG)
          .eq("status", "active");

        const seatRow = (seats ?? []).find((s) => s.entitlement_id);
        const entitlementId = (seatRow?.entitlement_id ?? owned?.[0]?.id) as string | undefined;
        if (!entitlementId) return; // licensed, but not for this product.

        const email =
          seatRow?.email ?? owned?.[0]?.email ?? user.email ?? "teammate";

        if (cancelled) return;
        setSelfEmail(email);
        setAvailable(true);

        // ---- shared document (create-on-demand by the app) ----
        const { data: ws } = await supabase
          .from("team_workspaces")
          .select("data")
          .eq("entitlement_id", entitlementId)
          .maybeSingle();
        if (ws?.data) setShared(ws.data as Record<string, unknown>);

        // ---- chat history ----
        const { data: msgs } = await supabase
          .from("team_messages")
          .select("id, user_id, author_email, body, created_at")
          .eq("entitlement_id", entitlementId)
          .order("created_at", { ascending: true })
          .limit(200);
        if (msgs) setMessages(msgs as unknown as TeamMessage[]);

        // ---- realtime: presence + editing broadcast + doc/chat changes ----
        const channel = supabase.channel(`team:${entitlementId}`, {
          config: { presence: { key: me } },
        });

        channel
          .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState() as Record<
              string,
              { email?: string; editing?: string | null }[]
            >;
            const now = Date.now();
            const list: Teammate[] = Object.entries(state)
              .filter(([id]) => id !== me)
              .map(([id, arr]) => {
                const p = arr[0] ?? {};
                return { id, userId: "", email: p.email ?? "teammate", editing: p.editing ?? null, at: now };
              });
            setTeammates(list);
          })
          .on("broadcast", { event: "editing" }, (payload) => {
            const p = payload.payload as { from?: string; email?: string; editing?: string | null };
            const from = p.from;
            if (!from || from === me) return;
            setTeammates((prev) => {
              const others = prev.filter((t) => t.id !== from);
              const editing = p.editing ?? null;
              if (!editing) return others;
              const next: Teammate = { id: from, userId: "", email: p.email ?? "teammate", editing, at: Date.now() };
              return [next, ...others];
            });
          })
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "team_workspaces", filter: `entitlement_id=eq.${entitlementId}` },
            (row) => {
              const next = (row.new as { data?: Record<string, unknown> } | null)?.data;
              if (next) setShared(next);
            }
          )
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "team_messages", filter: `entitlement_id=eq.${entitlementId}` },
            (row) => {
              const m = row.new as TeamMessageRow;
              setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m as unknown as TeamMessage]));
            }
          )
          .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "team_messages", filter: `entitlement_id=eq.${entitlementId}` },
            (row) => {
              const old = row.old as { id?: string };
              if (old.id) setMessages((prev) => prev.filter((m) => m.id !== old.id));
            }
          )
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              setConnected(true);
              await channel.track({ email, editing: null });
            } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setConnected(false);
            }
          });

        channelRef.current = channel;
      } catch {
        /* fail closed — Team stays unavailable, personal workspace unaffected */
      }
    })();

    return () => {
      cancelled = true;
      try {
        channelRef.current?.unsubscribe();
      } catch {
        /* already gone */
      }
    };
  }, [me]);


  const setEditing = useCallback(
    (label: string | null) => {
      const channel = channelRef.current;
      if (!channel) return;
      try {
        void channel.track({ email: selfEmail ?? "teammate", editing: label });
        void channel.send({
          type: "broadcast",
          event: "editing",
          payload: { from: me, email: selfEmail ?? "teammate", editing: label },
        });
      } catch {
        /* transient — presence will correct on next sync */
      }
    },
    [me, selfEmail]
  );

  /** Resolve the caller's entitlement id again at call time (RLS-scoped). */
  const resolveEntitlement = useCallback(async (): Promise<string | null> => {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return null;
    const { data: seats } = await supabase
      .from("seat_assignments")
      .select("entitlement_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    const { data: owned } = await supabase
      .from("entitlements")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_slug", PRODUCT_SLUG)
      .eq("status", "active")
      .maybeSingle();
    return (seats?.entitlement_id ?? owned?.id) as string | undefined ?? null;
  }, []);

  const sendMessage = useCallback(
    (body: string) => {
      const text = body.trim().slice(0, 2000);
      if (!text || !available) return;
      const supabase = createSupabaseBrowserClient();
      void (async () => {
        try {
          const { data: auth } = await supabase.auth.getUser();
          const user = auth.user;
          if (!user) return;
          const entitlementId = await resolveEntitlement();
          if (!entitlementId) return;
          await supabase.from("team_messages").insert({
            entitlement_id: entitlementId,
            user_id: user.id,
            author_email: user.email ?? selfEmail ?? "teammate",
            body: text,
          });
        } catch {
          /* chat is best-effort; never surface a throw into the UI */
        }
      })();
    },
    [available, resolveEntitlement, selfEmail]
  );

  const saveShared = useCallback(
    (data: Record<string, unknown>) => {
      if (!available) return;
      const supabase = createSupabaseBrowserClient();
      void (async () => {
        try {
          const { data: auth } = await supabase.auth.getUser();
          const user = auth.user;
          if (!user) return;
          const entitlementId = await resolveEntitlement();
          if (!entitlementId) return;
          await supabase
            .from("team_workspaces")
            .upsert(
              { entitlement_id: entitlementId, data, updated_by: user.id, created_by: user.id },
              { onConflict: "entitlement_id" }
            );
        } catch {
          /* shared-doc save is best-effort */
        }
      })();
    },
    [available, resolveEntitlement]
  );

  // Drop stale presence so "online" reflects reality without a socket ping.
  useEffect(() => {
    if (!available) return;
    const t = window.setInterval(() => {
      setTeammates((prev) => prev.filter((x) => isLive(x)));
    }, 8000);
    return () => window.clearInterval(t);
  }, [available]);

  return useMemo(
    () => ({ available, connected, teammates, messages, shared, setEditing, sendMessage, saveShared, selfEmail }),
    [available, connected, teammates, messages, shared, setEditing, sendMessage, saveShared, selfEmail]
  );
}

