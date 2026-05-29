'use client';

import { Menu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';

function DropdownMenu(props: Menu.Root.Props) {
  return <Menu.Root {...props} />;
}

function DropdownMenuTrigger({ className, ...props }: Menu.Trigger.Props) {
  return <Menu.Trigger className={cn('outline-none', className)} {...props} />;
}

function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 8,
  ...props
}: Menu.Popup.Props & { align?: 'start' | 'center' | 'end'; sideOffset?: number }) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} sideOffset={sideOffset} className="z-50">
        <Menu.Popup
          className={cn(
            'min-w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface-2 shadow-elev',
            'origin-(--transform-origin) transition-[transform,opacity] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

function DropdownMenuItem({ className, ...props }: Menu.Item.Props) {
  return (
    <Menu.Item
      className={cn(
        'block w-full cursor-pointer px-4 py-3 text-left text-sm font-display font-semibold text-foreground transition-colors outline-none',
        'data-highlighted:bg-surface-3 data-highlighted:text-foreground',
        'border-t border-line first:border-t-0',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: Menu.Separator.Props) {
  return <Menu.Separator className={cn('my-0 h-px bg-line', className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
