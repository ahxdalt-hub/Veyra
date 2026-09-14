/**
 * Account loading state — mirrors the shell layout (header block, sidebar,
 * content column) so route transitions feel stable rather than blank.
 * Shimmer and layout are quiet by design; the global reduced-motion rule
 * collapses the shimmer to a static block.
 */
export default function AccountLoading() {
  return (
    <div>
      <div className="border-b border-line bg-paper">
        <div className="container-page py-14 sm:py-16 lg:py-20">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-5 h-9 w-64 max-w-full" />
          <div className="skeleton mt-4 h-4 w-80 max-w-full" />
        </div>
      </div>
      <div className="min-h-[60vh] bg-surface">
        <div className="container-page py-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
            <aside className="self-start lg:sticky lg:top-28">
              <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-2">
                {["Overview", "Orders", "Your products", "Licences", "Settings"].map(
                  (label) => (
                    <div
                      key={label}
                      className="flex h-9 shrink-0 items-center gap-2.5 px-3"
                    >
                      <div className="skeleton h-4 w-4" />
                      <span className="skeleton h-3 w-20" />
                    </div>
                  )
                )}
              </div>
            </aside>
            <div className="min-w-0 space-y-4" aria-busy="true">
              <div className="skeleton h-20 w-full rounded-md" />
              <div className="skeleton h-20 w-full rounded-md" />
              <div className="skeleton h-20 w-5/6 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
