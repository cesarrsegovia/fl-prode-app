import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
      <header className="mb-8 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-2/3" />
      </header>

      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
