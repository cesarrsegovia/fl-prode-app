/**
 * Zona horaria de la app. Debe coincidir con la usada en el front
 * (MatchdayList) para que "hoy" signifique lo mismo en ambos lados.
 */
export const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/**
 * Rango UTC [inicio, fin) del día calendario actual en la TZ de la app.
 *
 * Argentina no aplica horario de verano: offset fijo UTC-3, así que la
 * medianoche local equivale a las 03:00 UTC del mismo día calendario local.
 * Si la TZ de la app cambiara a una con DST, este cálculo debe revisarse.
 */
export function todayRangeUtc(now: Date): { gte: Date; lt: Date } {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
  }).format(now);
  const gte = new Date(`${ymd}T03:00:00.000Z`);
  const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000);
  return { gte, lt };
}
