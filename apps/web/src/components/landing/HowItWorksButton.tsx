'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { FaqModal } from '@/components/common/FaqModal';

/**
 * CTA "Ver cómo funciona" de la landing: abre el FAQ en un modal.
 * Aislado como client component para que la page pueda seguir siendo server.
 */
export function HowItWorksButton() {
  const t = useTranslations('landing');
  const [faqOpen, setFaqOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setFaqOpen(true)}
        className="w-full sm:w-auto px-8 py-6 font-bold text-lg rounded-xl"
      >
        {t('hero.ctaSecondary')}
      </Button>
      <FaqModal open={faqOpen} onOpenChange={setFaqOpen} />
    </>
  );
}
