'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FaqModal } from '@/components/common/FaqModal';

const LINKS = [
  { href: '/terms', labelKey: 'terms' },
  { href: '/privacy', labelKey: 'privacy' },
  { href: '/support', labelKey: 'support' },
] as const;

export function Footer() {
  const t = useTranslations('nav');
  const [faqOpen, setFaqOpen] = useState(false);

  return (
    <footer className="w-full border-t border-line/40 bg-background/60 py-10 backdrop-blur-sm relative z-10">
      <div className="flex flex-col items-center gap-5 px-4">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-ink-muted hover:text-neon text-[11px] font-display font-semibold uppercase tracking-[0.18em] transition-colors"
            >
              {t(`footer.${l.labelKey}`)}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setFaqOpen(true)}
            className="text-ink-muted hover:text-neon text-[11px] font-display font-semibold uppercase tracking-[0.18em] transition-colors"
          >
            {t('footer.faq')}
          </button>
        </div>
        <FaqModal open={faqOpen} onOpenChange={setFaqOpen} />

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-[10px] font-display uppercase tracking-[0.22em] text-ink-muted">
          <span>{t('footer.copyright', { year: 2026 })}</span>
          <span className="text-line-strong">•</span>
          <span>V1.0</span>
          <span className="text-line-strong">•</span>
          <span>{t('footer.createdBy')}</span>
          <span className="inline-flex items-center gap-2 text-neon">
            <Image
              src="/images/footer/logo-fl.png"
              alt=""
              width={18}
              height={18}
              className="size-[18px] object-contain"
              aria-hidden="true"
            />
            <span>FUEGOLABZ</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
