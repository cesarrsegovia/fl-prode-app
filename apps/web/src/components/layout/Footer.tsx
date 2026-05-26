import Link from 'next/link';
import { useTranslations } from 'next-intl';

const LINKS = [
  { href: '/terms', labelKey: 'terms' },
  { href: '/privacy', labelKey: 'privacy' },
  { href: '/support', labelKey: 'support' },
] as const;

export function Footer() {
  const t = useTranslations('nav');

  return (
    <footer className="w-full py-12 border-t border-line/40 bg-background/60 backdrop-blur-sm relative z-10">
      <div className="flex flex-col items-center gap-4 px-4">
        <div className="flex gap-8">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-ink-muted hover:text-neon text-[11px] font-display font-semibold uppercase tracking-[0.18em] transition-colors"
            >
              {t(`footer.${l.labelKey}`)}
            </Link>
          ))}
        </div>
        <p className="text-ink-dim text-[10px] font-display uppercase tracking-[0.2em] text-center">
          {t('footer.copyright', { year: 2026 })}
        </p>
      </div>
    </footer>
  );
}
