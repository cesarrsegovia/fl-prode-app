import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="pb-24">
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-24 w-3/4" />
          <Skeleton className="h-4 w-32" />
        </div>
      </section>

      <div className="px-6 max-w-6xl mx-auto">
        <div className="flex gap-6 mb-8 border-b border-line/40 pb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      </div>
    </main>
  );
}
