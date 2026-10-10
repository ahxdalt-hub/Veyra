"use client";

/**
 * TeamOverlay — the small presence affordance for the opt-in Team workspace.
 *
 * A compact icon button in the app chrome. When teammates are connected it
 * shows a live count; clicking (or the icon itself on activity) opens a
 * smooth, rounded popover: who's online, a coloured "X is editing Y" pulse,
 * and a lightweight team chat. It renders nothing at all when the Team
 * workspace is unavailable (solo user / read-only demo), so the personal,
 * local-first experience is completely untouched.
 *
 * All motion respects reduced-motion; the "someone joined / said something"
 * cue reuses the shared Web Audio synth (sfx "teammate").
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MessageSquare, Send, Users, X } from "lucide-react";
import { useWorkspace } from "@/cgs-demo/lib/use-workspace";
import { paletteFor, shortName, type TeamMessage, type Teammate } from "@/cgs-demo/lib/team";
import { playSfx } from "@/lib/sound";

function initials(email: string): string {
  const s = shortName(email);
  return s.slice(0, 2).toUpperCase();
}

function PresenceRow({ t }: { t: Teammate }) {
  const pal = paletteFor(t.id);
  return (
    <li className="flex items-center gap-2.5 py-1.5">
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${pal.soft} text-[10px] font-semibold ${pal.text}`}>
          {initials(t.email)}
        </span>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-cgs-surface ${pal.dot}`}
          aria-hidden
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-cgs-ink">{shortName(t.email)}</span>
        {t.editing ? (
          <span className="block truncate text-[11.5px] text-cgs-muted">
            editing{" "}
            <strong className={`font-semibold ${pal.text}`}>{t.editing}</strong>
          </span>
        ) : (
          <span className="block truncate text-[11.5px] text-cgs-faint">online</span>
        )}
      </span>
    </li>
  );
}
function Chat({
  selfEmail,
  messages,
  sendMessage,
}: {
  selfEmail: string | null;
  messages: TeamMessage[];
  sendMessage: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    sendMessage(text);
    setDraft("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3.5 py-2">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-cgs-faint">
            No messages yet. Say hello to your team.
          </p>
        ) : (
          messages.map((m) => {
            const mine = selfEmail !== null && m.authorEmail === selfEmail;
            const pal = paletteFor(m.authorEmail);
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <span className="mb-0.5 px-1 text-[10.5px] text-cgs-faint">
                  {mine ? "You" : shortName(m.authorEmail)}
                </span>
                <span
                  className={`max-w-[85%] rounded-xl px-3 py-1.5 text-[12.5px] leading-snug ${
                    mine
                      ? "rounded-br-sm bg-cgs-accent text-[#fdf9f4]"
                      : `rounded-bl-sm bg-cgs-inset text-cgs-ink ${pal.soft}`
                  }`}
                >
                  {m.body}
                </span>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-cgs-line px-3 py-2.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message your team…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-lg border border-cgs-line-strong bg-cgs-surface px-2.5 py-1.5 text-[12.5px] text-cgs-ink outline-none placeholder:text-cgs-faint focus:border-cgs-accent"
          aria-label="Team message"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-cgs-accent text-[#fdf9f4] transition-opacity disabled:opacity-40"
          aria-label="Send message"
        >
          <Send size={13} aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function TeamOverlay() {
  const { team } = useWorkspace();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"people" | "chat">("people");
  const [now, setNow] = useState(() => Date.now());
  const prevCount = useRef(team.teammates.length);
  const prevMsgs = useRef(team.messages.length);

  // A ticking clock drives "online" freshness without calling an impure
  // function during render.
  useEffect(() => {
    if (!team.available) return;
    const t = window.setInterval(() => setNow(Date.now()), 8000);
    return () => window.clearInterval(t);
  }, [team.available]);

  // A soft cue when a teammate joins or a new message arrives (panel or not).
  useEffect(() => {
    if (!team.available) return;
    const joined = team.teammates.length > prevCount.current;
    const messaged = team.messages.length > prevMsgs.current;
    prevCount.current = team.teammates.length;
    prevMsgs.current = team.messages.length;
    if (joined || messaged) playSfx("teammate");
  }, [team.available, team.teammates.length, team.messages.length]);

  const online = useMemo(
    () => team.teammates.filter((t) => now - t.at <= 25_000),
    [team.teammates, now]
  );

  // Nothing to show for solo users / the read-only demo — the personal
  // workspace stays completely clean.
  if (!team.available) return null;

  const count = online.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 items-center gap-1.5 rounded-lg border border-cgs-line-strong bg-cgs-raised px-2.5 text-cgs-ink transition-colors hover:bg-cgs-inset"
        aria-expanded={open}
        aria-label={count > 0 ? `Team — ${count} online` : "Team workspace"}
      >
        <Users size={14} aria-hidden />
        <span className="text-[12px] font-medium tabular-nums">{count}</span>
        <span
          className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${team.connected ? "bg-cgs-complete" : "bg-cgs-faint"}`}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="team-pop"
            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.2, 0.6, 0.3, 1] }}
            className="absolute right-0 top-10 z-50 flex h-[380px] w-[300px] flex-col overflow-hidden rounded-2xl border border-cgs-line-strong bg-cgs-surface shadow-cgs-pop"
            role="dialog"
            aria-label="Team workspace"
          >
            <div className="flex items-center justify-between border-b border-cgs-line px-3.5 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${team.connected ? "bg-cgs-complete" : "bg-cgs-faint"}`} aria-hidden />
                <span className="text-[12.5px] font-semibold text-cgs-ink">Team</span>
                <span className="text-[11px] text-cgs-faint">
                  {team.connected ? `${count} online` : "connecting…"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-cgs-faint hover:bg-cgs-inset hover:text-cgs-ink"
                aria-label="Close team panel"
              >
                <X size={14} aria-hidden />
              </button>
            </div>

            <div className="flex gap-1 border-b border-cgs-line px-2 py-1.5">
              {(["people", "chat"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium capitalize transition-colors ${
                    tab === k ? "bg-cgs-inset text-cgs-ink" : "text-cgs-muted hover:text-cgs-ink"
                  }`}
                >
                  {k === "people" ? <Users size={12} aria-hidden /> : <MessageSquare size={12} aria-hidden />}
                  {k}
                </button>
              ))}
            </div>

            {tab === "people" ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-1">
                {online.length === 0 ? (
                  <p className="py-8 text-center text-[12px] leading-relaxed text-cgs-faint">
                    No one else is here right now.
                    <br />
                    Your team&rsquo;s shared workspace updates live when they join.
                  </p>
                ) : (
                  <ul>
                    {online.map((t) => (
                      <PresenceRow key={t.id} t={t} />
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <Chat selfEmail={team.selfEmail} messages={team.messages} sendMessage={team.sendMessage} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

