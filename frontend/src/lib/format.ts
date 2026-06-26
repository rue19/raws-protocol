export const formatAddress = (addr: string): string =>
  `${addr.slice(0, 4)}...${addr.slice(-4)}`

export const formatAmount = (amount: number, decimals = 2): string =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)

export const formatAPR = (apr: number): string =>
  `${apr >= 0 ? '+' : ''}${apr.toFixed(2)}%`

export const formatNEY = (ney: number): string =>
  `${ney >= 0 ? '+' : ''}${ney.toFixed(2)}%`

export const formatTVL = (tvl: number): string => {
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(1)}M`
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(0)}K`
  return `$${tvl.toFixed(0)}`
}

export const timeAgo = (isoString: string): string => {
  const diff = Date.now() - new Date(isoString).getTime()
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3600_000)}h ago`
}
