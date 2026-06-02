import { useTranslations } from 'next-intl';

/**
 * Traduce el nombre de una fecha/ronda a partir de su número de ronda.
 *
 * Los nombres de fecha vienen sembrados en español desde la BD (campo
 * `fixture.name`), por lo que no se pueden traducir con next-intl. En su lugar
 * mapeamos el número de ronda a una clave de traducción en `prode.fixture.roundNames`.
 * Si la ronda no está mapeada (p. ej. otro torneo), cae al genérico "Fecha {round}".
 */
export function useRoundName() {
  const t = useTranslations('prode');
  return (round: number) => {
    const key = `fixture.roundNames.${round}`;
    return t.has(key) ? t(key) : t('fixture.fallbackName', { round });
  };
}
