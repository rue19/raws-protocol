'use client'

interface SlippageSettingsProps {
  value: number
  onChange: (val: number) => void
}

const PRESETS = [0.1, 0.5, 1.0]

export function SlippageSettings({ value, onChange }: SlippageSettingsProps) {
  return (
    <div className="flex items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer ${
            value === p
              ? 'bg-cherry text-cotton'
              : 'bg-noir-2 text-dim border border-cotton/10 hover:border-cotton/20'
          }`}
        >
          {p}%
        </button>
      ))}
      <div className="relative">
        <input
          type="number"
          step="0.01"
          min="0.01"
          max="50"
          value={PRESETS.includes(value) ? '' : value}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v >= 0.01 && v <= 50) onChange(v)
          }}
          placeholder="Custom"
          className="w-20 bg-noir-2 border border-cotton/15 rounded px-2 py-0.5 text-xs font-mono text-cotton placeholder-dim"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-dim text-xs">%</span>
      </div>
      {value > 1 && (
        <span className="text-amber text-xs">High slippage — you may lose value</span>
      )}
    </div>
  )
}
