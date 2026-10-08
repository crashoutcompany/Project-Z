import { Skeleton } from "@/components/ui/skeleton";

function CatalogGridSkeleton({ sidebar = false }: { sidebar?: boolean }) {
  return (
    <div
      className={
        sidebar ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]" : "space-y-4"
      }
    >
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-[5/7] rounded-xl" />
          ))}
        </div>
      </div>
      {sidebar ? <Skeleton className="h-[28rem] rounded-2xl" /> : null}
    </div>
  );
}

export function CatalogLoading({
  sidebar = false,
  embedded = false,
}: {
  sidebar?: boolean;
  embedded?: boolean;
}) {
  const skeleton = embedded ? (
    <CatalogGridSkeleton sidebar={sidebar} />
  ) : (
    <div className="relative isolate min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-3 h-6 w-16 rounded-full" />
        <Skeleton className="mb-2 h-10 w-56" />
        <Skeleton className="mb-8 h-5 w-80 max-w-full" />
        <CatalogGridSkeleton sidebar={sidebar} />
      </div>
    </div>
  );

  return (
    <div role="status" aria-label="Loading catalog">
      {skeleton}
    </div>
  );
}
