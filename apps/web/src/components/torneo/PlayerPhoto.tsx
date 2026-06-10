'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const photoVariants = cva(
  'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-line/50',
  {
    variants: {
      size: {
        sm: 'size-8',
        md: 'size-12',
        lg: 'size-16',
        xl: 'size-24',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

const SIZE_PX: Record<NonNullable<Props['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

interface Props extends VariantProps<typeof photoVariants> {
  src?: string | null;
  alt: string;
  className?: string;
}

/** Iniciales del nombre para el fallback ("Lionel Messi" -> "LM"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Foto circular de un jugador. Las imágenes viven en /public/players y se
 * sirven por el CDN de Vercel; next/image las optimiza (webp, resize, lazy).
 * Si falta la imagen o falla la carga, cae a las iniciales.
 */
export function PlayerPhoto({ src, alt, size = 'md', className }: Props) {
  const [errored, setErrored] = useState(false);
  const px = SIZE_PX[size ?? 'md'];

  if (!src || errored) {
    return (
      <span
        className={cn(
          photoVariants({ size, className }),
          'text-[0.7em] font-bold text-ink-muted',
        )}
        aria-label={alt}
      >
        {initials(alt)}
      </span>
    );
  }

  return (
    <span className={cn(photoVariants({ size, className }))}>
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        loading="lazy"
        className="size-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
}
