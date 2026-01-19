'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { I18nProvider } from '@/lib/i18n/context';

const VibeKanbanWebCompanion = dynamic(
  () => import('vibe-kanban-web-companion').then((mod) => mod.VibeKanbanWebCompanion),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      {children}
      <VibeKanbanWebCompanion />
    </I18nProvider>
  );
}
