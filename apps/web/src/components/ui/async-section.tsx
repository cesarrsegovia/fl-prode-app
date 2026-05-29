import type { ReactNode } from 'react';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

interface AsyncSectionProps {
  isLoading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  /** UI de carga (skeletons). */
  skeleton: ReactNode;
  /** Mensaje cuando no hay datos. */
  emptyTitle?: string;
  emptyDescription?: string;
  empty?: ReactNode;
  /** Mensaje cuando hay error. */
  errorTitle?: string;
  errorFallback?: ReactNode;
  children: ReactNode;
}

export function AsyncSection({
  isLoading,
  error,
  isEmpty,
  skeleton,
  emptyTitle,
  emptyDescription,
  empty,
  errorTitle,
  errorFallback,
  children,
}: AsyncSectionProps) {
  if (isLoading) return <>{skeleton}</>;

  if (error) {
    if (errorFallback) return <>{errorFallback}</>;
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="text-destructive">{errorTitle ?? 'Error'}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  if (isEmpty) {
    if (empty) return <>{empty}</>;
    return (
      <Empty>
        <EmptyHeader>
          {emptyTitle && <EmptyTitle>{emptyTitle}</EmptyTitle>}
          {emptyDescription && <EmptyDescription>{emptyDescription}</EmptyDescription>}
        </EmptyHeader>
      </Empty>
    );
  }

  return <>{children}</>;
}
