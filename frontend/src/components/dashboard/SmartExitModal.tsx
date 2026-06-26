'use client';

import { useStore }   from '@/lib/store';
import { useWallet }  from '@/components/wallet/WalletProvider';
import { formatPct }  from '@/lib/utils';
import toast          from 'react-hot-toast';
import { useState }   from 'react';

export function SmartExitModal() {
  const { smartExitTarget, closeSmartExit, walletAddress } = useStore();
  const { signXdr }   = useWallet();
  const [loading, setLoading] = useState(false);

  if (!smartExitTarget) return null;

  async function handleExit() {
    if (!walletAddress || !smartExitTarget) return;
    setLoading(true);

    try {
      toast.loading('Building exit transaction...', { id: 'smart-exit' });

      // TODO: replace with real vault contract call from Phase 3
      // const xdr = await vaultContract.buildSmartExitTx(
      //   smartExitTarget.positionId,
      //   smartExitTarget.suggestedPool
      // );
      // await signXdr(xdr);

      await new Promise((r) => setTimeout(r, 1500));

      toast.success('Position moved successfully!', { id: 'smart-exit' });
      closeSmartExit();
    } catch (err) {
      toast.error('Exit failed — try again', { id: 'smart-exit' });
      console.error('Smart exit error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeSmartExit(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-[#0D0B0B]/80 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-sm bg-[#1B1717] border border-[#810100] rounded-sm p-5 space-y-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#810100] mb-1">
            Smart Exit
          </p>
          <p className="font-display text-lg font-bold text-[#EDEBDD] leading-tight">
            Move to a better pool
          </p>
        </div>

        <div className="bg-[#0D0B0B] rounded-[2px] p-3 space-y-2">
          {[
            ['Exit pool',     smartExitTarget.positionId.slice(0, 8) + '...'],
            ['Move to',       smartExitTarget.suggestedPool],
            ['Projected NEY', formatPct(smartExitTarget.projectedNey * 100)],
            ['Gas cost',      '~0.00015 XLM'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="font-mono text-[9px] text-[#7A6A6A] uppercase tracking-wide">{label}</span>
              <span className="font-mono text-[10px] font-medium text-[#EDEBDD]">{value}</span>
            </div>
          ))}
        </div>

        <p className="font-mono text-[9px] text-[#7A6A6A] leading-relaxed">
          This is atomic — if anything fails your funds are returned. You sign one transaction.
        </p>

        <div className="flex gap-2">
          <button
            onClick={closeSmartExit}
            className="flex-1 py-2.5 font-mono text-xs text-[#7A6A6A] border border-[#2A2020] rounded-[2px] hover:border-[#810100] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExit}
            disabled={loading}
            className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-wide bg-[#810100] text-[#EDEBDD] hover:bg-[#630000] transition-colors rounded-[2px] disabled:opacity-50"
          >
            {loading ? 'Exiting...' : 'Exit Now →'}
          </button>
        </div>
      </div>
    </div>
  );
}
