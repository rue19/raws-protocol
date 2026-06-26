'use client'
import { Spinner } from '@/components/ui/Spinner'
import { useTxPoller } from '@/hooks/useTxPoller'
import { formatAddress } from '@/lib/format'

interface TxStatusProps {
  phase: 'POLLING' | 'CONFIRMED' | 'ERROR'
  txHash: string | null
  errorMessage: string | null
  amount: string
  poolName: string
  onDepositAgain: () => void
  onClose: () => void
}

export function TxStatus({ phase, txHash, errorMessage, amount, poolName, onDepositAgain, onClose }: TxStatusProps) {
  if (phase === 'POLLING') {
    return (
      <div className="p-6 text-center animate-fade-in">
        <Spinner size={40} />
        <p className="text-cotton mt-4 text-lg font-serif">Submitting to Stellar...</p>
        {txHash && (
          <div className="mt-3">
            <p className="text-dim text-xs">Transaction hash</p>
            <p className="font-mono text-cotton text-sm">{formatAddress(txHash)}</p>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cherry text-xs hover:underline mt-1 inline-block"
            >
              View on explorer ↗
            </a>
          </div>
        )}
        <p className="text-dim text-xs mt-3">Checking confirmation every 500ms</p>
      </div>
    )
  }

  if (phase === 'CONFIRMED') {
    return (
      <div className="p-6 text-center animate-fade-in">
        <div className="animate-scale-in text-green text-5xl mb-3">✓</div>
        <p className="text-cotton text-lg font-serif">Deposit confirmed!</p>
        <p className="text-dim text-sm mt-2">
          You deposited {amount} into {poolName}
        </p>
        {txHash && (
          <div className="mt-3">
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cherry text-xs hover:underline"
            >
              Transaction: {formatAddress(txHash)} ↗
            </a>
          </div>
        )}
        <div className="flex gap-3 justify-center mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dim text-sm hover:text-cotton transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={onDepositAgain}
            className="px-4 py-2 bg-cherry text-cotton text-sm rounded-lg hover:bg-cherry-dim transition-colors cursor-pointer"
          >
            Deposit again
          </button>
        </div>
      </div>
    )
  }

  // ERROR
  return (
    <div className="p-6 text-center animate-fade-in">
      <div className="text-red text-4xl mb-3">✗</div>
      <p className="text-cotton text-lg font-serif">Transaction failed</p>
      <p className="text-red text-sm mt-2">{errorMessage}</p>
      <div className="flex gap-3 justify-center mt-4">
        <button
          onClick={onDepositAgain}
          className="px-4 py-2 bg-cherry text-cotton text-sm rounded-lg hover:bg-cherry-dim transition-colors cursor-pointer"
        >
          Try again
        </button>
        {txHash && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-cherry text-sm hover:underline"
          >
            View on explorer ↗
          </a>
        )}
      </div>
    </div>
  )
}
