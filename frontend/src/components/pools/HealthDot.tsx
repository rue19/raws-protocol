import type { HealthStatus } from '@/types'

const TOOLTIPS: Record<string, string> = {
  GREEN: 'Fees are beating IL',
  YELLOW: 'Near breakeven — watch this pool',
  RED: 'IL exceeding fees — consider exiting',
  RED_CRITICAL: 'IL exceeding fees for 90+ min — consider exiting',
  UNKNOWN: 'Awaiting first snapshot',
}

const COLORS: Record<string, string> = {
  GREEN: 'bg-[#2dbe6c]',
  YELLOW: 'bg-[#f59e0b]',
  RED: 'bg-[#e53935]',
  RED_CRITICAL: 'bg-[#e53935]',
  UNKNOWN: 'bg-[#6b7280]',
}

interface HealthDotProps {
  status: HealthStatus
}

export function HealthDot({ status }: HealthDotProps) {
  const pulse = status === 'RED_CRITICAL' ? 'animate-pulse-red' : ''

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${COLORS[status] ?? COLORS.UNKNOWN} ${pulse}`}
      title={TOOLTIPS[status] ?? TOOLTIPS.UNKNOWN}
    />
  )
}
