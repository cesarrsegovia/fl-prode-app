'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/dialog';

const KEYS = [
  'pointSystem',
  'winner',
  'exact',
  'champion',
  'topScorer',
  'deadline',
  'changePick',
  'privateGroups',
  'noPrediction',
  'etPenalties',
  'tieBreak',
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FaqModal({ open, onOpenChange }: Props) {
  const t = useTranslations('faq');
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('title')}>
      <div className="divide-y divide-line/40">
        {KEYS.map((k) => (
          <details key={k} className="group py-3">
            <summary className="cursor-pointer list-none py-1 font-display font-bold text-sm text-foreground flex items-center justify-between">
              <span>{t(`items.${k}.q`)}</span>
              <span className="text-ink-muted group-open:rotate-180 transition-transform">
                ▾
              </span>
            </summary>
            <div className="pt-2 pb-1 text-sm text-ink-muted space-y-2">
              <p>{t(`items.${k}.a`)}</p>
              {k === 'tieBreak' && (
                <div className="mt-3">
                  <p className="font-bold text-foreground">
                    {t('items.tieBreak.exampleTitle')}
                  </p>
                  <table className="mt-2 w-full text-xs border-collapse">
                    <thead>
                      <tr className="text-left text-ink-dim">
                        <th className="py-1 pr-2">
                          {t('items.tieBreak.colPos')}
                        </th>
                        <th className="py-1 pr-2">
                          {t('items.tieBreak.colPlayer')}
                        </th>
                        <th className="py-1 pr-2">
                          {t('items.tieBreak.colPoints')}
                        </th>
                        <th className="py-1 pr-2">
                          🎯 {t('items.tieBreak.colExact')}
                        </th>
                        <th className="py-1">
                          ⚽ {t('items.tieBreak.colGoals')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground">
                      <tr>
                        <td className="py-1 pr-2">1°</td>
                        <td className="py-1 pr-2">Ana</td>
                        <td className="py-1 pr-2">5</td>
                        <td className="py-1 pr-2 text-neon">1</td>
                        <td className="py-1 text-neon">3</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-2">2°</td>
                        <td className="py-1 pr-2">Pablo</td>
                        <td className="py-1 pr-2">5</td>
                        <td className="py-1 pr-2 text-neon">1</td>
                        <td className="py-1 text-neon">1</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-2">3°</td>
                        <td className="py-1 pr-2">Diego</td>
                        <td className="py-1 pr-2">3</td>
                        <td className="py-1 pr-2">0</td>
                        <td className="py-1">—</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="mt-2">{t('items.tieBreak.exampleNote')}</p>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </Dialog>
  );
}
