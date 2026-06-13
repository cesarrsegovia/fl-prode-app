'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

interface Props {
  grupos: ReactNode;
  calendario: ReactNode;
  eliminatorias: ReactNode;
}

const TAB_VALUES = ['grupos', 'calendario', 'eliminatorias'] as const;

export function TournamentTabs({
  grupos,
  calendario,
  eliminatorias,
}: Props) {
  const t = useTranslations('torneo.tabs');
  const [value, setValue] = useState('grupos');
  const panels: Record<string, ReactNode> = {
    grupos,
    calendario,
    eliminatorias,
  };

  return (
    <Tabs value={value} onValueChange={setValue} className="w-full">
      <TabsList variant="line" className="mb-8 border-b border-line/40 rounded-none w-full justify-start gap-6 h-auto p-0">
        {TAB_VALUES.map((value) => (
          <TabsTrigger
            key={value}
            value={value}
            className="font-display font-bold uppercase tracking-[0.15em] text-xs px-1 pb-3 h-auto rounded-none data-active:text-neon"
          >
            {t(value)}
          </TabsTrigger>
        ))}
      </TabsList>

      {TAB_VALUES.map((value) => (
        <TabsContent key={value} value={value} className="mt-0">
          {panels[value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
