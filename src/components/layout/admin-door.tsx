"use client";

import { useRouter } from "next/navigation";

/**
 * The quiet door. A 6px amber dot in the footer's lower bar, visually
 * identical in register to the brand dot beside the Veyra wordmark —
 * it reads as a design accent, not a control. Clicking it routes to
 * the command center, where the normal auth gate takes over.
 *
 * Obscurity only: this hides the portal from people who aren't
 * looking, it is NOT the security boundary. The middleware + service-
 * role role checks are.
 */

export function AdminDoor() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Command center"
      title="Command center"
      onClick={() => router.push("/admin")}
      className="group -m-2 cursor-pointer p-2 align-middle"
    >
      <span
        aria-hidden="true"
        className="block h-1.5 w-1.5 rounded-full bg-amber transition-all duration-300 group-hover:scale-150 group-hover:shadow-[0_0_8px_rgba(201,164,92,0.55)]"
      />
    </button>
  );
}
