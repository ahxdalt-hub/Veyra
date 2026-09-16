import { Skeleton } from "@/components/admin/admin-ui";

/** Route-level loading for the command center: the shell stays mounted
 *  (it's the layout), so pages just need a quiet content placeholder. */
export default function AdminLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-[180px]" />
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-[320px]" />
        <Skeleton className="h-[320px]" />
      </div>
    </div>
  );
}
