import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn(
      'font-mono text-[10px] font-medium uppercase tracking-[0.12em]',
      'text-[#7A6A6A] mb-3',
      className
    )}>
      {children}
    </p>
  );
}
