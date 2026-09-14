import type { SVGProps } from "react";

/**
 * Admin icon set — same 16px grid / 1.5px stroke language as the
 * storefront set, for the command center's navigation and events.
 * Decorative only; always paired with visible text or aria-label.
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

export function AdminGridIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="2" width="5" height="5" rx="0.5" />
      <rect x="9" y="2" width="5" height="5" rx="0.5" />
      <rect x="2" y="9" width="5" height="5" rx="0.5" />
      <rect x="9" y="9" width="5" height="5" rx="0.5" />
    </Icon>
  );
}

export function AdminOrdersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 1.5h8V14.5H4z" />
      <path d="M6 4.5h4M6 7h4M6 9.5h4" />
    </Icon>
  );
}

export function AdminUsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.5 13.5c.5-2.5 2.3-4 4.5-4s4 1.5 4.5 4" />
      <path d="M10.5 4a2.5 2.5 0 0 1 0 5M11.5 9.8c1.6.5 2.7 1.8 3 3.7" />
    </Icon>
  );
}

export function AdminBoxIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5 14 4.5v7L8 14.5 2 11.5v-7L8 1.5Z" />
      <path d="M2 4.5 8 7.5l6-3M8 7.5v7" />
    </Icon>
  );
}

export function AdminKeyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="11" r="2.5" />
      <path d="m6.8 9.2 5-5M11 4.5l1.8 1.8M9.5 6l1.8 1.8" />
    </Icon>
  );
}

export function AdminCardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="3" width="13" height="10" rx="1.2" />
      <path d="M1.5 6h13M4 9.5h2" />
    </Icon>
  );
}

export function AdminTruckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1.5 3.5h8v8h-8zM9.5 6h3l2 2.5v3h-5" />
      <circle cx="4" cy="12.5" r="1" />
      <circle cx="11.5" cy="12.5" r="1" />
    </Icon>
  );
}

export function AdminChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 13.5h11M4.5 11V7.5M8 11V3.5M11.5 11V6" />
    </Icon>
  );
}

export function AdminBellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 11.5h9c-1-1.3-1.5-2.4-1.5-4.5a3.5 3.5 0 1 0-7 0c0 2.1-.5 3.2-1.5 4.5Z" />
      <path d="M6.5 13.5a1.6 1.6 0 0 0 3 0" />
    </Icon>
  );
}

export function AdminCogIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" />
    </Icon>
  );
}

export function AdminLogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 2.5h-4v11h4M9 4.5l3.5 3.5L9 11.5M12.5 8h-7" />
    </Icon>
  );
}

export function AdminLockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="7" width="9" height="7" rx="1" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </Icon>
  );
}

export function AdminSearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </Icon>
  );
}

export function AdminCloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3l10 10M13 3 3 13" />
    </Icon>
  );
}

export function AdminCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 8.5 6 12l7.5-8" />
    </Icon>
  );
}

export function AdminAlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.75 14.75 13.5H1.25L8 1.75Z" />
      <path d="M8 6v3.25M8 11.4v.1" />
    </Icon>
  );
}

export function AdminCopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1" />
      <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
    </Icon>
  );
}

export function AdminArrowIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 8h11.5M9 3.5 13.5 8 9 12.5" />
    </Icon>
  );
}
