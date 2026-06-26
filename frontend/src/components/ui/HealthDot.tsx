import { cn, healthDotColor } from '@/lib/utils';

interface HealthDotProps {
  status: string;
  size?:  'sm' | 'md';
}

export function HealthDot({ status, size = 'md' }: HealthDotProps) {
  const sizeClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const pulse = (status === 'RED' || status === 'RED_CRITICAL') ? 'animate-pulse' : '';
  return (
    <span
      className={cn('inline-block rounded-full flex-shrink-0', sizeClass, healthDotColor(status), pulse)}
      aria-label={`Pool health: ${status}`}
    />
  );
}
