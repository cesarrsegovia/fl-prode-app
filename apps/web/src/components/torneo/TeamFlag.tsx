import Image from 'next/image';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const flagVariants = cva(
  'inline-flex shrink-0 overflow-hidden rounded-sm bg-surface-2 ring-1 ring-line/50',
  {
    variants: {
      size: {
        xs: 'size-4',
        sm: 'size-6',
        md: 'size-8',
        lg: 'size-12',
        xl: 'size-16',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

const SIZE_PX: Record<NonNullable<Props['size']>, number> = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

interface Props extends VariantProps<typeof flagVariants> {
  src?: string | null;
  alt: string;
  className?: string;
}

export function TeamFlag({ src, alt, size = 'md', className }: Props) {
  const px = SIZE_PX[size ?? 'md'];

  if (!src) {
    return (
      <span
        className={cn(flagVariants({ size, className }), 'items-center justify-center text-[0.6em] font-bold text-ink-muted')}
        aria-label={alt}
      >
        {alt.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <span className={cn(flagVariants({ size, className }))}>
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        className="size-full object-cover"
        unoptimized
      />
    </span>
  );
}
