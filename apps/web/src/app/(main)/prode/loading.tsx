import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <header className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-20 w-3/4" />
        <Skeleton className="h-9 w-48 rounded-xl" />
      </header>

      <div className="space-y-3 mb-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-9 w-full" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
