'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, diceBearAvatar } from '@/lib/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function UserAvatar({ name, email, image, size = 'default', className }: UserAvatarProps) {
  const displayName = name ?? email ?? '';
  const src = image || diceBearAvatar(email || name || 'prode');
  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={src} alt={displayName} />
      <AvatarFallback className={cn('bg-neon text-primary-foreground font-bold')}>
        {getInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
