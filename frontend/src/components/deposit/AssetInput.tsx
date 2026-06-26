'use client'

interface AssetInputProps {
  value: string
  onChange: (val: string) => void
  asset: string
  balance?: number
  error?: string
}

export function AssetInput({ value, onChange, asset, balance, error }: AssetInputProps) {
  return (
    <div>
      <label className="text-dim text-xs block mb-1">You deposit</label>
      <div className="flex items-center bg-noir-2 border border-cotton/15 rounded-lg overflow-hidden">
        <div className="px-3 py-3 border-r border-cotton/10">
          <span className="font-mono text-cotton text-sm font-medium">{asset}</span>
        </div>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="flex-1 bg-transparent px-3 py-3 font-mono text-cotton text-lg placeholder-dim outline-none"
        />
      </div>
      {balance !== undefined && (
        <p className="text-dim text-xs mt-1">
          Balance: {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {asset}
        </p>
      )}
      {error && <p className="text-red text-xs mt-1">{error}</p>}
    </div>
  )
}
