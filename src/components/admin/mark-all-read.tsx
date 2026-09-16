"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CcButton } from "@/components/admin/admin-ui";
import { useNotifications } from "@/components/admin/notifications";

/** Mark every unread notification read (API-backed; refreshes bell). */
export function MarkAllReadButton({ count }: { count: number }) {
  const { markAllRead } = useNotifications();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <CcButton
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        markAllRead();
        start(() => router.refresh());
      }}
    >
      {pending ? "Marking…" : `Mark ${count} read`}
    </CcButton>
  );
}
