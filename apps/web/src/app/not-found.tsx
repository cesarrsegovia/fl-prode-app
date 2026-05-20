import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-3">
          Error 404
        </p>
        <h1 className="font-display font-extrabold text-foreground tracking-[-0.04em] text-[clamp(3rem,8vw,5.5rem)] leading-[0.95] mb-6">
          Offside.
        </h1>
        <p className="text-sm text-ink-muted mb-8">
          La página que buscás no existe o se mudó. Volvé a la cancha principal.
        </p>
        <Link href="/home">
          <Button className="font-display font-bold">Ir al inicio</Button>
        </Link>
      </div>
    </main>
  );
}
