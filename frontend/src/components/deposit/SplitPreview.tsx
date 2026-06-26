import { formatAmount } from '@/lib/format'

interface SplitPreviewProps {
  tokenA: string
  tokenB: string
  amountA: number
  amountB: number
}

export function SplitPreview({ tokenA, tokenB, amountA, amountB }: SplitPreviewProps) {
  return (
    <div className="bg-noir-2 rounded-lg p-3">
      <p className="text-dim text-xs mb-2">Auto-split preview</p>
      <div className="flex items-center gap-2 text-sm font-mono text-cotton">
        <span>{formatAmount(amountA)} {tokenA}</span>
        <span className="text-dim">+</span>
        <span>{formatAmount(amountB)} {tokenB}</span>
      </div>
      <p className="text-dim text-xs mt-1">(optimal 50/50 by value at market)</p>
    </div>
  )
}
