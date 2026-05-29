/** Opciones para deadlines cortos (ej. "11 jun"). */
export const DEADLINE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
};

/** Opciones para fecha+hora de partido (ej. "mar 11 jun, 18:30"). */
export const MATCH_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

function toDate(input: Date | string | null | undefined): Date | null {
  if (input == null) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function format(
  input: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  locale?: string,
): string {
  const d = toDate(input);
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return '—';
  }
}

export function formatDeadline(
  input: Date | string | null | undefined,
  locale?: string,
): string {
  return format(input, DEADLINE_FORMAT, locale);
}

export function formatMatchDate(
  input: Date | string | null | undefined,
  locale?: string,
): string {
  return format(input, MATCH_DATE_FORMAT, locale);
}
