'use client';

import { type ReactNode, useState } from 'react';
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
  estadios: ReactNode;
}

const TABS = [
  { value: 'grupos', label: 'Grupos' },
  { value: 'calendario', label: 'Calendario' },
  { value: 'eliminatorias', label: 'Eliminatorias' },
  { value: 'estadios', label: 'Estadios' },
];

export function TournamentTabs({
  grupos,
  calendario,
  eliminatorias,
  estadios,
}: Props) {
  const [value, setValue] = useState('grupos');
  const panels: Record<string, ReactNode> = {
    grupos,
    calendario,
    eliminatorias,
    estadios,
  };

  return (
    <Tabs value={value} onValueChange={setValue} className="w-full">
      <TabsList variant="line" className="mb-8 border-b border-line/40 rounded-none w-full justify-start gap-6 h-auto p-0">
        {TABS.map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="font-display font-bold uppercase tracking-[0.15em] text-xs px-1 pb-3 h-auto rounded-none data-active:text-neon"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {TABS.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-0">
          {panels[t.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
