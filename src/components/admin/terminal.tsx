"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Panel,
  CcButton,
  ConfirmDialog,
  Field,
  inputClass,
  inputStyle,
} from "@/components/admin/admin-ui";
import { products } from "@/lib/products";
import {
  terminalLookupAction,
  terminalGrantAccessAction,
  terminalConfirmPaymentAction,
  terminalResendReceiptAction,
  terminalRefundAction,
  terminalRevokeAccessAction,
  type TerminalResult,
} from "@/app/admin/terminal-actions";

/**
 * Terminals — operational commands as buttons, not screens. A command rail
 * on the left (pick a command, fill the fields, Run) and a console on the
 * right that prints exactly what the server did, line by line. Destructive
 * commands pass through a strong confirmation; every run is audited
 * server-side. This surface is a convenience over the same server actions
 * the rest of the command center uses — hiding buttons is not the protection.
 */

type Tone = "ok" | "err" | "warn" | "info" | "dim";

type Entry =
  | { id: number; kind: "cmd"; text: string }
  | { id: number; kind: "out"; result: TerminalResult };

type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "email" | "select" | "checkbox";
  options?: { value: string; label: string }[];
  hint?: string;
  optional?: boolean;
};

type CommandDef = {
  id: string;
  name: string;
  desc: string;
  fields: FieldDef[];
  /** The CLI-style echo line printed in the console before the result. */
  echo: (v: Record<string, string | boolean>) => string;
  run: (v: Record<string, string | boolean>) => Promise<TerminalResult>;
  danger?: boolean;
  confirm?: { title: string; body: string; confirmLabel: string };
};

const TONE_COLOR: Record<Tone, string> = {
  ok: "var(--cc-success)",
  err: "var(--cc-error)",
  warn: "var(--cc-warning)",
  info: "var(--cc-text-2)",
  dim: "var(--cc-text-4)",
};

const availableProducts = products
  .filter((p) => p.status === "available")
  .map((p) => ({ value: p.slug, label: p.name }));

const COMMANDS: CommandDef[] = [
  {
    id: "lookup",
    name: "lookup",
    desc: "What does this email or order have?",
    fields: [
      {
        key: "query",
        label: "Email or order reference",
        placeholder: "customer@gmail.com  or  VEYRA-ABCD1",
      },
    ],
    echo: (v) => `lookup ${v.query}`,
    run: (v) => terminalLookupAction(String(v.query ?? "")),
  },
  {
    id: "grant-access",
    name: "grant-access",
    desc: "Give a product to an email — licence + receipt email, no checkout.",
    fields: [
      { key: "email", label: "Customer email", placeholder: "customer@gmail.com", type: "email" },
      { key: "productSlug", label: "Product", type: "select", options: availableProducts },
      { key: "seats", label: "Seats", type: "number", placeholder: "1", hint: "1–5. Customer takes seat 1; the rest are assignable from their account." },
      { key: "amountDollars", label: "Amount paid (USD)", type: "number", placeholder: "0", optional: true, hint: "What they actually paid outside checkout, for the record. Leave 0 for a comp." },
    ],
    echo: (v) =>
      `grant-access --email ${v.email} --product ${v.productSlug} --seats ${v.seats || 1} --amount $${v.amountDollars || 0}`,
    run: (v) =>
      terminalGrantAccessAction({
        email: String(v.email ?? ""),
        productSlug: String(v.productSlug ?? ""),
        seats: Number(v.seats) || 1,
        amountDollars: Number(v.amountDollars) || null,
      }),
  },
  {
    id: "confirm-payment",
    name: "confirm-payment",
    desc: "Payment arrived but the order is still pending — confirm and deliver now.",
    fields: [{ key: "orderRef", label: "Order reference", placeholder: "VEYRA-ABCD1 or internal id" }],
    echo: (v) => `confirm-payment ${v.orderRef}`,
    run: (v) => terminalConfirmPaymentAction(String(v.orderRef ?? "")),
  },
  {
    id: "resend-receipt",
    name: "resend-receipt",
    desc: "The purchase email never arrived — send it again.",
    fields: [{ key: "orderRef", label: "Order reference", placeholder: "VEYRA-ABCD1 or internal id" }],
    echo: (v) => `resend-receipt ${v.orderRef}`,
    run: (v) => terminalResendReceiptAction(String(v.orderRef ?? "")),
  },
  {
    id: "refund",
    name: "refund",
    desc: "Refund the money and revoke access in one move.",
    danger: true,
    confirm: {
      title: "Refund this order?",
      body: "The money goes back through Lemon Squeezy and the customer's access is revoked immediately — devices released, licence closed, seats freed. A refund confirmation email is sent. This is the real thing.",
      confirmLabel: "Refund & revoke",
    },
    fields: [
      { key: "orderRef", label: "Order reference", placeholder: "VEYRA-ABCD1 or internal id" },
      { key: "refundMoney", label: "Refund the money via Lemon Squeezy API", type: "checkbox", hint: "Uncheck to only revoke access (money handled in the dashboard)." },
    ],
    echo: (v) => `refund ${v.orderRef}${v.refundMoney ? " --money" : " --access-only"}`,
    run: (v) => terminalRefundAction(String(v.orderRef ?? ""), v.refundMoney !== false),
  },
  {
    id: "revoke-access",
    name: "revoke-access",
    desc: "Cut access without touching money.",
    danger: true,
    confirm: {
      title: "Revoke access for this order?",
      body: "Devices are released and the licence + entitlement close immediately — downloads and activations fail from now on. No refund is issued and no email goes out. The customer's data stays intact.",
      confirmLabel: "Revoke access",
    },
    fields: [{ key: "orderRef", label: "Order reference", placeholder: "VEYRA-ABCD1 or internal id" }],
    echo: (v) => `revoke-access ${v.orderRef}`,
    run: (v) => terminalRevokeAccessAction(String(v.orderRef ?? "")),
  },
];

const DEFAULTS: Record<string, Record<string, string | boolean>> = Object.fromEntries(
  COMMANDS.map((c) => [
    c.id,
    Object.fromEntries(
      c.fields.map((f) => [f.key, f.type === "checkbox" ? (f.key === "refundMoney" ? true : false) : ""])
    ),
  ])
);

export function Terminal() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("lookup");
  const [values, setValues] = useState(DEFAULTS);
  const [history, setHistory] = useState<Entry[]>([]);
  const [pending, setPending] = useState(false);
  const [confirmCmd, setConfirmCmd] = useState<CommandDef | null>(null);
  const nextId = useRef(1);
  const consoleRef = useRef<HTMLDivElement>(null);

  const selected = COMMANDS.find((c) => c.id === selectedId) ?? COMMANDS[0];

  // Keep the console pinned to the newest line.
  useEffect(() => {
    const el = consoleRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, pending]);

  function setValue(key: string, value: string | boolean) {
    setValues((v) => ({ ...v, [selected.id]: { ...v[selected.id], [key]: value } }));
  }

  function pick(id: string) {
    setSelectedId(id);
  }

  async function execute(cmd: CommandDef) {
    const cmdValues = values[cmd.id];
    setConfirmCmd(null);
    setPending(true);
    const echoText = cmd.echo(cmdValues);
    setHistory((h) => [...h, { id: nextId.current++, kind: "cmd", text: echoText }]);
    try {
      const result = await cmd.run(cmdValues);
      setHistory((h) => [...h, { id: nextId.current++, kind: "out", result }]);
      if (result.ok) router.refresh();
    } catch {
      setHistory((h) => [
        ...h,
        {
          id: nextId.current++,
          kind: "out",
          result: { ok: false, lines: [{ text: "Command failed — network or server error. Check the server logs.", tone: "err" }] },
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (selected.danger && selected.confirm) {
      setConfirmCmd(selected);
      return;
    }
    void execute(selected);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* — Command rail — */}
      <div className="flex flex-col gap-4">
        <Panel padded={false} title="Commands">
          <ul>
            {COMMANDS.map((c) => {
              const on = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c.id)}
                    aria-current={on ? "true" : undefined}
                    className="relative flex w-full flex-col gap-0.5 border-b px-4 py-3 text-left transition-colors last:border-b-0"
                    style={{
                      borderColor: "var(--cc-line)",
                      backgroundColor: on ? "var(--cc-surface-2)" : undefined,
                      color: on ? "var(--cc-text)" : "var(--cc-text-2)",
                    }}
                    onMouseEnter={(e) => {
                      if (!on) e.currentTarget.style.backgroundColor = "var(--cc-surface)";
                    }}
                    onMouseLeave={(e) => {
                      if (!on) e.currentTarget.style.backgroundColor = "";
                    }}
                  >
                    {on && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                        style={{ backgroundColor: c.danger ? "var(--cc-error)" : "var(--cc-accent)" }}
                      />
                    )}
                    <span className="font-mono text-[13px]">
                      {c.name}
                      {c.danger ? (
                        <span className="ml-2 text-[10px] uppercase tracking-wider" style={{ color: "var(--cc-error)" }}>
                          danger
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs leading-snug" style={{ color: "var(--cc-text-4)" }}>
                      {c.desc}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* — Selected command form — */}
        <Panel title={`Run — ${selected.name}`}>
          <form onSubmit={onSubmit} method="post" className="flex flex-col gap-3.5">
            {selected.fields.map((f) =>
              f.type === "checkbox" ? (
                <label key={f.key} className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={values[selected.id][f.key] !== false && values[selected.id][f.key] !== "false"}
                    onChange={(e) => setValue(f.key, e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-[var(--cc-accent)]"
                  />
                  <span className="text-xs leading-snug" style={{ color: "var(--cc-text-2)" }}>
                    {f.label}
                    {f.hint ? (
                      <span className="mt-0.5 block" style={{ color: "var(--cc-text-4)" }}>
                        {f.hint}
                      </span>
                    ) : null}
                  </span>
                </label>
              ) : f.type === "select" ? (
                <Field key={f.key} label={f.label} hint={f.hint}>
                  <select
                    className={`${inputClass} appearance-none`}
                    style={inputStyle}
                    value={String(values[selected.id][f.key] ?? "")}
                    onChange={(e) => setValue(f.key, e.target.value)}
                  >
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field key={f.key} label={f.label} hint={f.hint}>
                  <input
                    type={f.type ?? "text"}
                    className={inputClass}
                    style={inputStyle}
                    placeholder={f.placeholder}
                    value={String(values[selected.id][f.key] ?? "")}
                    onChange={(e) => setValue(f.key, e.target.value)}
                  />
                </Field>
              )
            )}
            <CcButton type="submit" variant={selected.danger ? "danger" : "accent"} disabled={pending}>
              {pending ? "Running…" : `Run ${selected.name}`}
            </CcButton>
          </form>
        </Panel>
      </div>

      {/* — Console — */}
      <Panel
        title="Console"
        padded={false}
        action={
          <button
            type="button"
            onClick={() => setHistory([])}
            className="text-xs transition-colors"
            style={{ color: "var(--cc-text-4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cc-text-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--cc-text-4)")}
          >
            Clear
          </button>
        }
      >
        <div
          ref={consoleRef}
          className="h-[560px] overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed"
          style={{
            backgroundColor: "var(--cc-bg)",
            borderTop: "1px solid var(--cc-line)",
            color: "var(--cc-text-2)",
          }}
          data-lenis-prevent=""
          aria-live="polite"
        >
          {history.length === 0 && !pending ? (
            <div className="flex h-full flex-col justify-center">
              <p style={{ color: "var(--cc-text-4)" }}>Veyra command terminal — ready.</p>
              <p className="mt-1.5" style={{ color: "var(--cc-text-4)" }}>
                Pick a command on the left, fill in the fields, run it.
              </p>
              <p className="mt-1.5" style={{ color: "var(--cc-text-4)" }}>
                Every run is written to the audit log under your account.
              </p>
            </div>
          ) : (
            <>
              {history.map((entry) =>
                entry.kind === "cmd" ? (
                  <p key={entry.id} className="mt-2.5 break-words first:mt-0">
                    <span style={{ color: "var(--cc-accent)" }}>❯ </span>
                    <span style={{ color: "var(--cc-text)" }}>{entry.text}</span>
                  </p>
                ) : (
                  <div key={entry.id} className="py-0.5">
                    {entry.result.lines.map((line, i) => (
                      <p key={i} className="whitespace-pre-wrap break-words" style={{ color: TONE_COLOR[line.tone ?? "info"] }}>
                        {line.text}
                      </p>
                    ))}
                    {entry.result.ok ? (
                      <p className="mt-1" style={{ color: "var(--cc-success)" }}>✓ done</p>
                    ) : (
                      <p className="mt-1" style={{ color: "var(--cc-error)" }}>✗ failed</p>
                    )}
                  </div>
                )
              )}
              {pending ? (
                <p className="animate-pulse" style={{ color: "var(--cc-text-4)" }}>
                  running…
                </p>
              ) : null}
            </>
          )}
        </div>
      </Panel>

      <ConfirmDialog
        open={confirmCmd !== null}
        onClose={() => setConfirmCmd(null)}
        title={confirmCmd?.confirm?.title ?? ""}
        body={confirmCmd?.confirm?.body ?? ""}
        confirmLabel={confirmCmd?.confirm?.confirmLabel ?? "Confirm"}
        pendingLabel="Running…"
        danger
        onConfirm={async () => {
          if (confirmCmd) await execute(confirmCmd);
        }}
      />
    </div>
  );
}
