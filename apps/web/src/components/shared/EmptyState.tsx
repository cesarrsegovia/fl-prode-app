'use client';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </p>
      {description && (
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
