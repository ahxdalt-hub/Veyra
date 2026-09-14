import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Button — the single source of button styling.
 *
 * Variants:
 *  - primary: ink on paper, the workhorse
 *  - accent: deep moss, for the highest-value CTAs
 *  - outline: hairline border
 *  - ghost: text-only
 *
 * Sizes: sm / md / lg. Renders <button> by default; `href` renders <Link>.
 * All variants share one geometry (h-10/11/12, radius-sm) so button rows
 * align perfectly across sections.
 */

type ButtonVariant = "primary" | "accent" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-2 rounded-sm font-medium tracking-[-0.01em] whitespace-nowrap transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-paper hover:bg-ink-2 active:bg-ink shadow-xs",
  accent:
    "bg-accent text-white hover:bg-accent-deep active:bg-accent-deep shadow-xs",
  outline:
    "border border-line-strong bg-surface text-ink hover:border-ink/30 hover:bg-accent-soft/60 active:bg-accent-soft",
  ghost:
    "text-ink-2 hover:text-ink hover:bg-accent-soft/70",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-[0.9375rem]",
};

/** Arrow that nudges on hover — used by CTAs that navigate. */
export function ButtonArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 translate-x-0 transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 8h11.5M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  arrow?: boolean;
  onClick?: () => void;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"button">, "children" | "onClick">;

export function Button({
  variant = "primary",
  size = "md",
  href,
  arrow = false,
  onClick,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
        {arrow ? <ButtonArrow /> : null}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
      {arrow ? <ButtonArrow /> : null}
    </button>
  );
}
