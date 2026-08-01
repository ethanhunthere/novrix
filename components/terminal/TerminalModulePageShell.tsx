'use client';

import type { ReactNode } from 'react';
import TerminalIntelligenceHeader, { type TerminalIntelligenceHeaderProps } from './TerminalIntelligenceHeader';
import TerminalModuleBar from './TerminalModuleBar';

type TerminalModulePageShellProps = {
  header: TerminalIntelligenceHeaderProps;
  children: ReactNode;
};

export default function TerminalModulePageShell({ header, children }: TerminalModulePageShellProps) {
  return (
    <>
      <TerminalModuleBar />

      <main className="flex-1 w-full max-w-[2000px] 3xl:max-w-[2800px] 4xl:max-w-[3600px] mx-auto px-4 lg:px-6 xl:px-8 2xl:px-10 3xl:px-16 4xl:px-24 py-5 pb-16" style={{ position: 'relative', zIndex: 1 }}>
        <TerminalIntelligenceHeader {...header} />
        {children}
      </main>
    </>
  );
}
