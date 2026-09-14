import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

/**
 * Input — the single input style for the design system.
 * Label + optional description + error messaging + hint text.
 * Mono eyebrow label for the editorial spec-sheet feel.
 */

type InputProps = {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
} & ComponentPropsWithoutRef<"input">;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, hint, error, trailing, className = "", ...rest }, ref) {
    const id = useId();
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;
    const describedBy =
      [hint ? hintId : null, error ? errorId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className="mb-2 block text-xs font-medium tracking-wide text-ink-2"
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={`h-11 w-full rounded-sm border bg-surface px-3.5 text-sm text-ink placeholder:text-ink-4 transition-colors duration-200 ${
              error
                ? "border-clay/60 focus:border-clay focus:outline-clay"
                : "border-line-strong focus:border-accent focus:outline-accent"
            } ${className}`}
            {...rest}
          />
          {trailing ? (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
              {trailing}
            </div>
          ) : null}
        </div>
        {hint && !error ? (
          <p
            id={hintId}
            className="animate-rise mt-2 text-xs text-ink-3"
          >
            {hint}
          </p>
        ) : null}
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="animate-shake mt-2 text-xs text-clay"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);
