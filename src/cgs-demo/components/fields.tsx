"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BlockMeta,
  EntryItem,
  FieldMeta,
  ListMeta,
  ModuleData,
  ModuleId,
  TextItem,
  isFieldFilled,
  listFilled,
} from "@/cgs-demo/lib/stages";
import { Chip } from "@/cgs-demo/components/ui";
import { useStore } from "@/cgs-demo/lib/store";

/* ------------------------------ field shell ------------------------------- */

function FieldShell({
  field,
  htmlFor,
  error,
  children,
}: {
  field: FieldMeta;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-cgs-ink">
          {field.label}
          {field.required && <span className="ml-1 text-cgs-accent" aria-hidden title="Required">*</span>}
        </label>
        {field.hint && <span className="text-[11.5px] text-cgs-faint hidden md:block">{field.hint}</span>}
      </div>
      {children}
      {field.hint && <p className="text-[11.5px] text-cgs-faint md:hidden">{field.hint}</p>}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden text-[12px] text-cgs-danger"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border bg-cgs-raised px-3 py-2 text-sm text-cgs-ink placeholder:text-cgs-faint transition-colors duration-150 focus:border-cgs-accent";
const okCls = "border-cgs-line-strong";
const errCls = "border-cgs-danger/60";

/* -------------------------------- text ------------------------------------ */

export function TextField({
  field,
  value,
  onChange,
  error,
}: {
  field: FieldMeta;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <FieldShell field={field} htmlFor={id} error={error}>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-required={field.required || undefined}
        aria-invalid={error ? true : undefined}
        className={`${inputCls} ${error ? errCls : okCls}`}
      />
    </FieldShell>
  );
}

/* ------------------------------ textarea ---------------------------------- */

export function TextAreaField({
  field,
  value,
  onChange,
  error,
}: {
  field: FieldMeta;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <FieldShell field={field} htmlFor={id} error={error}>
      <textarea
        id={id}
        ref={ref}
        rows={2}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-required={field.required || undefined}
        aria-invalid={error ? true : undefined}
        className={`${inputCls} ${error ? errCls : okCls} resize-none leading-relaxed`}
      />
    </FieldShell>
  );
}

/* -------------------------------- choice ---------------------------------- */

export function ChoiceField({
  field,
  value,
  onChange,
  error,
}: {
  field: FieldMeta;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const id = useId();
  const name = `${id}`;
  return (
    <FieldShell field={field} htmlFor={id} error={error}>
      <div
        role="radiogroup"
        aria-label={field.label}
        aria-required={field.required || undefined}
        aria-invalid={error ? true : undefined}
        className="flex flex-wrap gap-1.5"
      >
        {field.options?.map((opt) => {
          const selected = value === opt;
          return (
            <label
              key={opt}
              className={`cursor-pointer select-none rounded-lg border px-3 py-1.5 text-[13px] transition-colors duration-150 ${
                selected
                  ? "border-cgs-accent bg-cgs-accent-faint text-cgs-accent-deep font-medium"
                  : "border-cgs-line-strong bg-cgs-raised text-cgs-muted hover:text-cgs-ink-soft hover:border-cgs-faint"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={opt}
                checked={selected}
                onChange={() => onChange(opt)}
                className="sr-only"
              />
              {opt}
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}

/* --------------------------------- tags ----------------------------------- */

export function TagsField({
  field,
  value,
  onChange,
  error,
}: {
  field: FieldMeta;
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const t = raw.trim().replace(/,+$/, "");
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  };
  return (
    <FieldShell field={field} htmlFor={id} error={error}>
      <div className="flex flex-wrap items-center gap-1.5">
        <AnimatePresence initial={false}>
          {value.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <Chip ariaLabel={`Tag: ${tag}`} onRemove={() => onChange(value.filter((t) => t !== tag))}>
                {tag}
              </Chip>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          id={id}
          type="text"
          value={draft}
          placeholder={value.length === 0 ? field.placeholder : "Add…"}
          onChange={(e) => {
            const v = e.target.value;
            if (v.endsWith(",")) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          aria-required={field.required || undefined}
          className={`${error ? errCls : okCls} min-w-36 flex-1 rounded-lg border bg-cgs-raised px-3 py-1.5 text-sm text-cgs-ink placeholder:text-cgs-faint transition-colors focus:border-cgs-accent`}
        />
      </div>
      {field.min && field.min > 1 && value.length < field.min && (
        <p className="text-[11.5px] text-cgs-faint">Add at least {field.min} — {value.length} so far.</p>
      )}
    </FieldShell>
  );
}

/* -------------------------------- dispatch -------------------------------- */

export function FieldInput({
  moduleId,
  field,
  data,
  error,
}: {
  moduleId: ModuleId;
  field: FieldMeta;
  data: ModuleData;
  error?: string;
}) {
  const { setField } = useStore();
  const raw = data.fields[field.key];
  const onChange = (v: string | string[]) => setField(moduleId, field.key, v);
  switch (field.type) {
    case "textarea":
      return <TextAreaField field={field} value={typeof raw === "string" ? raw : ""} onChange={onChange} error={error} />;
    case "choice":
      return <ChoiceField field={field} value={typeof raw === "string" ? raw : ""} onChange={onChange} error={error} />;
    case "tags":
      return <TagsField field={field} value={Array.isArray(raw) ? raw : []} onChange={onChange} error={error} />;
    default:
      return <TextField field={field} value={typeof raw === "string" ? raw : ""} onChange={onChange} error={error} />;
  }
}

/* -------------------------------- lists ----------------------------------- */

function TextListRow({
  item,
  list,
  onChange,
  onRemove,
}: {
  item: TextItem;
  list: ListMeta;
  onChange: (patch: Partial<TextItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-center gap-2">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cgs-accent/50" aria-hidden />
      <input
        type="text"
        value={item.text}
        placeholder={list.itemPlaceholder}
        onChange={(e) => onChange({ text: e.target.value })}
        aria-label={list.itemLabel}
        className={`${inputCls} ${okCls} flex-1 py-1.5`}
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${list.itemLabel}`}
        className="rounded-md p-1.5 text-transparent transition group-hover:text-cgs-faint hover:!text-cgs-danger hover:bg-cgs-danger-soft focus-visible:text-cgs-faint"
      >
        <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden>
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function EntryListRow({
  item,
  index,
  list,
  onChange,
  onRemove,
}: {
  item: EntryItem;
  index: number;
  list: ListMeta;
  onChange: (patch: Partial<EntryItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group relative pl-7">
      <span
        className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-cgs-line-strong bg-cgs-surface text-[10.5px] font-semibold text-cgs-muted"
        aria-hidden
      >
        {index + 1}
      </span>
      <div className="space-y-1.5 pb-0.5">
        <input
          type="text"
          value={item.title}
          placeholder={list.itemPlaceholder ?? "Step"}
          onChange={(e) => onChange({ title: e.target.value })}
          aria-label={`${list.itemLabel} ${index + 1}`}
          className={`${inputCls} ${okCls} w-full py-1.5 font-medium`}
        />
        <input
          type="text"
          value={item.detail}
          placeholder={list.detailPlaceholder ?? list.detailLabel}
          onChange={(e) => onChange({ detail: e.target.value })}
          aria-label={list.detailLabel ?? `Details for step ${index + 1}`}
          className={`${inputCls} ${okCls} w-full border-dashed py-1.5 text-[13px] text-cgs-ink-soft`}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${list.itemLabel} ${index + 1}`}
        className="absolute right-0 top-1.5 rounded-md p-1.5 text-transparent transition group-hover:text-cgs-faint hover:!text-cgs-danger hover:bg-cgs-danger-soft focus-visible:text-cgs-faint"
      >
        <svg width="11" height="11" viewBox="0 0 10 10" aria-hidden>
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function ListBlock({ moduleId, block }: { moduleId: ModuleId; block: BlockMeta }) {
  const { data, addItem, updateItem, removeItem } = useStore();
  const reduce = useReducedMotion();
  const list = block.list;
  if (!list?.__blockId) return null;
  const items = data.modules[moduleId].lists[list.__blockId] ?? [];

  return (
    <div className="space-y-2.5">
      <AnimatePresence initial={false}>
        {items.map((item, i) =>
          list.itemKind === "text" ? (
            <motion.div
              key={item.id}
              layout={!reduce}
              initial={!reduce ? { opacity: 0, y: -4 } : undefined}
              animate={{ opacity: 1, y: 0 }}
              exit={!reduce ? { opacity: 0, x: -8 } : undefined}
              transition={{ duration: 0.18 }}
            >
              <TextListRow
                item={item as TextItem}
                list={list}
                onChange={(patch) => updateItem(moduleId, list.__blockId!, item.id, patch)}
                onRemove={() => removeItem(moduleId, list.__blockId!, item.id)}
              />
            </motion.div>
          ) : (
            <motion.div
              key={item.id}
              layout={!reduce}
              initial={!reduce ? { opacity: 0, y: -4 } : undefined}
              animate={{ opacity: 1, y: 0 }}
              exit={!reduce ? { opacity: 0, x: -8 } : undefined}
              transition={{ duration: 0.18 }}
            >
              <EntryListRow
                item={item as EntryItem}
                index={i}
                list={list}
                onChange={(patch) => updateItem(moduleId, list.__blockId!, item.id, patch)}
                onRemove={() => removeItem(moduleId, list.__blockId!, item.id)}
              />
            </motion.div>
          ),
        )}
      </AnimatePresence>
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-cgs-line-strong bg-cgs-surface/60 px-3 py-2 text-[12.5px] text-cgs-faint">
          Nothing added yet — {list.addLabel.toLowerCase()} to get started.
        </p>
      )}
      <button
        type="button"
        onClick={() => addItem(moduleId, block)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-medium text-cgs-accent transition-colors hover:bg-cgs-accent-faint hover:text-cgs-accent-deep"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {list.addLabel}
      </button>
      {list.min && list.min > 1 && items.filter((i) => (list.itemKind === "text" ? (i as TextItem).text.trim() : (i as EntryItem).title.trim())).length < list.min && (
        <p className="text-[11.5px] text-cgs-faint">A complete {list.itemLabel} list has at least {list.min} entries.</p>
      )}
    </div>
  );
}

/* ------------------------------ block card -------------------------------- */

export function BlockCard({
  moduleId,
  block,
  data,
  showErrors,
}: {
  moduleId: ModuleId;
  block: BlockMeta;
  data: ModuleData;
  showErrors: boolean;
}) {
  const filled = blockRequiredFilled(block, data);
  const total = blockRequiredTotal(block);
  return (
    <section
      id={`block-${block.id}`}
      className="rounded-xl border border-cgs-line bg-cgs-surface shadow-cgs-card"
      aria-label={block.title}
    >
      <header className="flex items-start justify-between gap-4 border-b border-cgs-line/70 px-5 py-3.5">
        <div>
          <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-cgs-ink">
            {block.title}
            {total > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10px] font-medium tabular-nums ${
                  filled === total ? "bg-cgs-complete-soft text-cgs-complete" : "bg-cgs-inset text-cgs-muted"
                }`}
                aria-label={`${filled} of ${total} required items complete`}
              >
                {filled}/{total}
              </span>
            )}
          </h3>
          {block.description && <p className="mt-0.5 text-[12px] text-cgs-muted">{block.description}</p>}
        </div>
      </header>
      <div className="space-y-5 px-5 py-5">
        {block.fields?.map((f) => {
          const error =
            showErrors && f.required && !isFieldFilled(f, data)
              ? `${f.label} is required to mark this module complete.`
              : undefined;
          return <FieldInput key={f.key} moduleId={moduleId} field={f} data={data} error={error} />;
        })}
        {block.list && <ListBlock moduleId={moduleId} block={block} />}
        {block.note && (
          <p className="flex gap-2 rounded-lg bg-cgs-accent-faint px-3 py-2 text-[12px] leading-relaxed text-cgs-accent-deep">
            <svg width="13" height="13" viewBox="0 0 16 16" className="mt-0.5 shrink-0" aria-hidden>
              <path
                d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 3a.85.85 0 1 1 0 1.7.85.85 0 0 1 0-1.7Zm1.1 7H6.9v-.9h1v-3.4h-1V6.3h2.2v4.3h-1v.9Z"
                fill="currentColor"
              />
            </svg>
            {block.note}
          </p>
        )}
      </div>
    </section>
  );
}

export function blockRequiredTotal(block: BlockMeta): number {
  let n = 0;
  for (const f of block.fields ?? []) if (f.required) n += 1;
  if (block.list?.required) n += 1;
  return n;
}

export function blockRequiredFilled(block: BlockMeta, data: ModuleData): number {
  let n = 0;
  for (const f of block.fields ?? []) if (f.required && isFieldFilled(f, data)) n += 1;
  if (block.list?.required && block.list.__blockId && listFilled(block.list, data)) n += 1;
  return n;
}
