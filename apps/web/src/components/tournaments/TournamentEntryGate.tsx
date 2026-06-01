'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  tournamentEntry,
  type TournamentEntryDto,
} from '@/lib/endpoints';

interface Props {
  tournamentId: string;
  entryFee: number | null;
  entryCurrency: string | null;
  tournamentName?: string;
  /** Render-prop: cuando el usuario está inscripto, mostramos su contenido. */
  children: React.ReactNode;
}

/**
 * Bloquea el contenido del torneo hasta que el usuario tenga TournamentEntry PAID.
 * Si entryFee es null/0, deja pasar directo (torneo gratuito).
 * Si hay entryFee, muestra botón "Inscribirme por $X" que dispara moveFunds Debit
 * vía /tournaments/:id/entry.
 */
export function TournamentEntryGate({
  tournamentId,
  entryFee,
  entryCurrency,
  tournamentName,
  children,
}: Props) {
  const [entry, setEntry] = useState<TournamentEntryDto | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = entryFee && entryFee > 0 ? entryFee : 0;
  const currency = entryCurrency || 'USD';

  useEffect(() => {
    if (fee === 0) {
      setEntry({} as TournamentEntryDto); // pasa transparente
      return;
    }
    tournamentEntry
      .mine(tournamentId)
      .then(setEntry)
      .catch(() => setEntry(null));
  }, [tournamentId, fee]);

  if (entry === undefined) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="size-6 animate-spin text-ink-muted" />
      </div>
    );
  }

  if (entry || fee === 0) return <>{children}</>;

  const handleJoin = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await tournamentEntry.join(tournamentId);
      setEntry(created);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || 'No se pudo procesar la inscripción';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-1 border border-line rounded-2xl p-8 text-center space-y-4">
      <h2 className="text-2xl font-bold text-foreground">
        Inscripción al torneo
        {tournamentName ? ` · ${tournamentName}` : ''}
      </h2>
      <p className="text-ink-muted">
        Para participar tenés que abonar la entrada.
      </p>
      <div className="text-4xl font-black text-neon">
        {fee.toLocaleString(undefined, {
          style: 'currency',
          currency,
        })}
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm font-medium">{error}</p>
      )}
      <button
        className="w-full bg-neon text-primary-foreground font-black py-4 rounded-xl uppercase tracking-tight disabled:opacity-50"
        type="button"
        disabled={submitting}
        onClick={handleJoin}
      >
        {submitting ? 'Procesando…' : 'Inscribirme'}
      </button>
    </div>
  );
}
