import { formatNEY } from '@/lib/format'
import type { HealthStatus } from '@/types'

interface NEYScoreProps {
  ney: number
  health: HealthStatus
}

const HEALTH_COLOR: Record<string, string> = {
  GREEN: 'text-green',
  YELLOW: 'text-amber',
  RED: 'text-red',
  RED_CRITICAL: 'text-red',
  UNKNOWN: 'text-dim',
}

export function NEYScore({ ney, health }: NEYScoreProps) {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN

  return (
    <span className={`font-mono text-lg font-semibold ${color}`}>
      {formatNEY(ney)}
    </span>
  )
}
