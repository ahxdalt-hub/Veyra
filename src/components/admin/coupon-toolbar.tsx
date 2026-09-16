"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Drawer, CcButton, Field, inputClass, inputStyle } from "@/components/admin/admin-ui";
import { createCouponAction, updateCouponAction, setCouponActiveAction, type CouponInput } from "@/app/admin/mutations";
import type { CouponRow } from "@/lib/supabase/types";

/**
 * CouponToolbar + editor. Create is a "+ New coupon" button opening the
 * editor drawer; ?focus=code opens the editor for an existing row.
 * Deactivate/reactivate are inline, behind a consequence-stating confirm.
 * Every submit runs the server action which validates AGAIN (the frontend
 * copy is convenience, never the decision).
 */

export function CouponToolbar({
  focus,
  coupons,
}: {
  focus: string | null;
  coupons: CouponRow[];
}) {
  const router = useRouter();
  const editing = useMemo(
    () => (focus ? coupons.find((c) => c.code === focus) ?? null : null),
    [focus, coupons]
  );
  const open = !!focus;

  const close = () => router.replace("/admin/coupons", { scroll: false });

  return (
    <>
      <CcButton
        variant="accent"
        size="sm"
        onClick={() => router.replace("/admin/coupons?focus=new")}
      >
        + New coupon
      </CcButton>
      <CouponEditor
        open={open}
        mode={focus === "new" ? "create" : "edit"}
        coupon={editing}
        onClose={close}
        onSaved={close}
      />
    </>
  );
}

function CouponEditor({
  open,
  mode,
  coupon,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  coupon: CouponRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // `edit` mode only renders when coupon exists; create ignores it.
  const key = coupon?.code ?? "new";
  return <EditorBody key={key} open={open} mode={mode} coupon={coupon} onClose={onClose} onSaved={onSaved} />;
}

function EditorBody({
  open,
  mode,
  coupon,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  coupon: CouponRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);

  const initial: CouponInput = {
    code: coupon?.code ?? "",
    label: coupon?.label ?? "",
    kind: coupon?.kind ?? "percent",
    value: coupon?.value ?? 10,
    active: coupon ? coupon.active : true,
    starts_at: coupon?.starts_at ?? null,
    ends_at: coupon?.ends_at ?? null,
    min_subtotal: coupon?.min_subtotal ?? null,
    max_uses: coupon?.max_uses ?? null,
    per_customer_limit: coupon?.per_customer_limit ?? null,
  };

  function readForm(): CouponInput | null {
    const f = form.current;
    if (!f) return null;
    const d = new FormData(f);
    const intOrNull = (name: string): number | null => {
      const v = String(d.get(name) ?? "").trim();
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? Math.floor(n) : NaN;
    };
    const dateOrNull = (name: string): string | null => {
      const v = String(d.get(name) ?? "").trim();
      return v || null;
    };
    return {
      code: String(d.get("code") ?? ""),
      label: String(d.get("label") ?? ""),
      kind: d.get("kind") === "fixed" ? "fixed" : "percent",
      value: Number(d.get("value") ?? 0),
      active: d.get("active") === "on",
      starts_at: dateOrNull("starts_at"),
      ends_at: dateOrNull("ends_at"),
      min_subtotal: intOrNull("min_subtotal"),
      max_uses: intOrNull("max_uses"),
      per_customer_limit: intOrNull("per_customer_limit"),
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    const input = readForm();
    if (!input) return;
    start(async () => {
      const res =
        mode === "create"
          ? await createCouponAction(input)
          : await updateCouponAction(coupon!.code, input);
      if (res.ok) {
        setOk(res.message);
        setTimeout(onSaved, 700);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={mode === "create" ? "New coupon" : "Edit coupon"}
      subtitle={mode === "edit" ? "Changes take effect at checkout immediately" : "Works at checkout as soon as it's saved"}
    >
      <form ref={form} onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code">
            <input
              name="code"
              defaultValue={initial.code}
              disabled={mode === "edit"}
              spellCheck={false}
              autoComplete="off"
              placeholder="SPRING25"
              className={`${inputClass} font-mono uppercase`}
              style={inputStyle}
            />
          </Field>
          <Field label="Kind">
            <select
              name="kind"
              defaultValue={initial.kind}
              className={inputClass}
              style={{ ...inputStyle, colorScheme: "dark" }}
            >
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
          </Field>
        </div>

        <Field label="Value" hint="Percent: 1–100 · Fixed: whole dollars off">
          <input
            name="value"
            type="number"
            min={1}
            max={1000000}
            defaultValue={initial.value}
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        <Field label="Label" hint="Shown to yourself in reports">
          <input
            name="label"
            defaultValue={initial.label}
            maxLength={120}
            placeholder="Spring — 25% off"
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts" hint="Blank = immediately">
            <input
              type="date"
              name="starts_at"
              defaultValue={initial.starts_at ?? ""}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="Ends" hint="Blank = no expiry">
            <input
              type="date"
              name="ends_at"
              defaultValue={initial.ends_at ?? ""}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Min subtotal" hint="USD, optional">
            <input
              type="number"
              name="min_subtotal"
              min={0}
              defaultValue={initial.min_subtotal ?? ""}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="Max uses" hint="Total, optional">
            <input
              type="number"
              name="max_uses"
              min={0}
              defaultValue={initial.max_uses ?? ""}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label="Per customer" hint="Optional">
            <input
              type="number"
              name="per_customer_limit"
              min={0}
              defaultValue={initial.per_customer_limit ?? ""}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2.5 text-sm" style={{ color: "var(--cc-text-2)" }}>
          <input
            type="checkbox"
            name="active"
            defaultChecked={initial.active}
            className="h-4 w-4 rounded-sm"
            style={{ accentColor: "var(--cc-accent)" }}
          />
          Active at checkout
        </label>

        {error ? (
          <p role="alert" className="animate-shake text-sm" style={{ color: "var(--cc-error)" }}>
            {error}
          </p>
        ) : null}
        {ok ? (
          <p role="status" className="text-sm" style={{ color: "var(--cc-success)" }}>
            {ok}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--cc-line)" }}>
          {mode === "edit" && coupon ? (
            <ActiveToggle code={coupon.code} active={coupon.active} />
          ) : (
            <span />
          )}
          <CcButton type="submit" variant="accent" disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Create coupon" : "Save changes"}
          </CcButton>
        </div>
      </form>
    </Drawer>
  );
}

function ActiveToggle({ code, active }: { code: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <CcButton
        variant={active ? "danger" : "outline"}
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setCouponActiveAction(code, !active);
            setMsg(res.ok ? res.message : res.error);
          })
        }
      >
        {active ? "Deactivate" : "Reactivate"}
      </CcButton>
      {msg ? (
        <span className="text-xs" style={{ color: "var(--cc-text-3)" }}>
          {msg}
        </span>
      ) : null}
    </div>
  );
}
