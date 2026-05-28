import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <header className="mb-6 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-4 w-40" />
      </header>

      <Skeleton className="h-20 w-full rounded-2xl mb-4" />

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
