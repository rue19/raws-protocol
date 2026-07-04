import { formatNEY } from '@/lib/utils'
import type { HealthStatus } from '@/types'

interface NEYScoreProps {
  ney: number
  health: HealthStatus
}

const HEALTH_COLOR: Record<string, string> = {
  GREEN: 'text-[#2dbe6c]',
  YELLOW: 'text-[#f59e0b]',
  RED: 'text-[#e53935]',
  RED_CRITICAL: 'text-[#e53935]',
  UNKNOWN: 'text-[#6b7280]',
}

export function NEYScore({ ney, health }: NEYScoreProps) {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN

  return (
    <span className={`font-mono text-lg font-semibold ${color}`}>
      {formatNEY(ney)}
    </span>
  )
}
