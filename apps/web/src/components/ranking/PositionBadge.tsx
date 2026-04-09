'use client';

export function PositionBadge({ position }: { position: number }) {
  const colors: Record<number, string> = {
    1: '#FFD700',
    2: '#C0C0C0',
    3: '#CD7F32',
  };

  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
      style={{
        background: colors[position] || 'var(--surface)',
        color: position <= 3 ? '#000' : 'var(--text-primary)',
      }}
    >
      {position}
    </span>
  );
}
