import type { SVGProps } from "react";

/**
 * Icons — one consistent set on a 16px grid, 1.5px stroke.
 * Sizes via className (h-4 w-4 default; system uses 14–20px).
 * All decorative; always pair with visible text or aria-label.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </Icon>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1.5 2.5h1.6l1.1 8.2a1 1 0 0 0 1 .8h6.6a1 1 0 0 0 1-.8l1-5.2H4" />
      <circle cx="6.5" cy="13.5" r="1" />
      <circle cx="11.5" cy="13.5" r="1" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="5.5" r="2.75" />
      <path d="M2.5 14c.6-2.8 2.8-4.5 5.5-4.5s4.9 1.7 5.5 4.5" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 4h12M2 8h12M2 12h12" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3l10 10M13 3 3 13" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 8.5 6 12l7.5-8" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 8h11.5M9 3.5 13.5 8 9 12.5" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2v8m0 0 3-3m-3 3L5 7M2.5 13.5h11" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3v10M3 8h10" />
    </Icon>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8h10" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 3.5h11M6.5 3.5V2h3v1.5M4 3.5l.6 9a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-9" />
    </Icon>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="3" width="13" height="10" rx="1" />
      <path d="m2 4 6 5 6-5" />
    </Icon>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 2.5h4.5V7M13 3 7 9M12 9.5v3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3" />
    </Icon>
  );
}

/** Module glyphs for the What's Inside section — slightly larger, 20px use. */
export function LeadsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 3.5h5v5h-5zM8.5 3.5h5v5h-5zM2.5 8.5h5v5h-5zM8.5 8.5h5v5h-5z" />
    </Icon>
  );
}

export function OutreachIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 4l6 4 6-4M2 4.5v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1Z" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </Icon>
  );
}

export function PipelineIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 3.5h11M2.5 8h11M2.5 12.5h11" />
      <circle cx="5.5" cy="3.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="8" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12.5" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function HandshakeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1.5 5.5 4.5 3l3 2 3-2 3 2.5v4l-3 3-2-2-2 2-3-3v-4Z" />
    </Icon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 13.5h11M4.5 11V7M8 11V3.5M11.5 11V5.5" />
    </Icon>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m8 2 5.5 3L8 8 2.5 5 8 2Z" />
      <path d="m2.5 8 5.5 3 5.5-3M2.5 11l5.5 3 5.5-3" />
    </Icon>
  );
}

export function DocIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 1.5h5.5L13 5v9.5H4V1.5Z" />
      <path d="M9.5 1.5V5H13M6 8.5h4M6 11h4" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5 3 3.5v4c0 3.5 2.2 6 5 7 2.8-1 5-3.5 5-7v-4L8 1.5Z" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
    </Icon>
  );
}
