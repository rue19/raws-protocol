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
  green:  'border-l-2 border-l-[#2dbe6c]',
  amber:  'border-l-2 border-l-[#f59e0b]',
  red:    'border-l-2 border-l-[#e53935]',
  none:   '',
};

export function Card({ children, className, accent = 'none', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border border-[#ddd0b3]',
        'rounded-[10px] p-4',
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
