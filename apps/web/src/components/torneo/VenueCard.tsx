import { useFormatter, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { VenueDto } from '@/lib/server-endpoints';

interface Props {
  venue: VenueDto;
}

export function VenueCard({ venue }: Props) {
  const t = useTranslations('torneo.venue');
  const format = useFormatter();
  const capacity = venue.capacity ? format.number(venue.capacity) : null;
  const matches = venue._count?.matches ?? 0;

  return (
    <Card className="bg-surface-1 border-line overflow-hidden">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-grass/30 to-surface-3 flex items-end p-4">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent 0, transparent 8px, oklch(45% 0.13 150 / 0.4) 8px, oklch(45% 0.13 150 / 0.4) 9px)',
          }}
        />
        <h3 className="relative font-display font-extrabold text-2xl text-foreground tracking-tight leading-tight drop-shadow-[0_1px_3px_oklch(0%_0_0/0.6)]">
          {venue.name}
        </h3>
      </div>

      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-sm text-ink-muted">
            {venue.city}
            {venue.country && (
              <span className="text-ink-dim"> · {venue.country}</span>
            )}
          </p>
          {matches > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {t('matchesCount', { count: matches })}
            </Badge>
          )}
        </div>

        {capacity && (
          <div className="flex items-baseline gap-2 pt-2 border-t border-line/40">
            <span className="font-display font-extrabold text-2xl text-neon tabular-nums">
              {capacity}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-dim font-display">
              {t('capacity')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
