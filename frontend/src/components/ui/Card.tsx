import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  children:  ReactNode;
  className?: string;
  /** Left accent bar colour — 'cherry' | 'green' | 'amber' | 'red' | 'none' */
  accent?:   'cherry' | 'green' | 'amber' | 'red' | 'none';
  onClick?:  () => void;
}

const accentMap: Record<string, string> = {
  cherry: 'border-l-2 border-l-[#810100]',
  green:  'border-l-2 border-l-[#1D9E75]',
  amber:  'border-l-2 border-l-[#BA7517]',
  red:    'border-l-2 border-l-[#C0392B]',
  none:   '',
};

export function Card({ children, className, accent = 'none', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[#1B1717] border border-[#2A2020]',
        'rounded-sm p-4',
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:border-[#810100]',
        accentMap[accent],
        className,
      )}
    >
      {children}
    </div>
  );
}
