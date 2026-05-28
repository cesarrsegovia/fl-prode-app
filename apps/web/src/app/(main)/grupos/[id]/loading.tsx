import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="pt-24 pb-24 px-4 max-w-4xl mx-auto">
      <header className="mb-6 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </header>

      <div className="flex gap-2 mb-6 border-b border-line/40 pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
