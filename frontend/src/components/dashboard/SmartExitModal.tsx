'use client';

import { useStore } from '@/lib/store';
import { formatPct } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { useWithdraw } from '@/hooks/useWithdraw';
import { useDepositSingleAsset } from '@/hooks/useDepositSingleAsset';
import { getHorizonServer, getSorobanServer } from '@/lib/stellar';
import { Contract, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

type SmartExitStep = 'WITHDRAW' | 'DEPOSIT' | 'COMPLETE';

export function SmartExitModal() {
  const { smartExitTarget, closeSmartExit, positions } = useStore();
  const [step, setStep] = useState<SmartExitStep>('WITHDRAW');
  const [withdrawResult, setWithdrawResult] = useState<{ amount: number; token: string } | null>(null);
  const [positionData, setPositionData] = useState<{
    lpTokenAddress: string;
    tokenAddress: string;
    dfTokenBalance: number;
  } | null>(null);

  // Find the position data
  const position = smartExitTarget 
    ? positions.find(p => p.id === smartExitTarget.positionId)
    : null;

  // Extract pool info from position
  const poolParts = position?.pool_id?.split('/') ?? [];
  const currentPoolName = poolParts.length >= 2 
    ? `${poolParts[0]}/${poolParts[1]}`
    : position?.pool_id ?? 'Unknown';

  // Initialize hooks with default values (will be updated when position data loads)
  const { state: withdrawState, executeWithdraw, reset: resetWithdraw } = useWithdraw({
    lpTokenAddress: positionData?.lpTokenAddress ?? '',
    maxAmount: positionData?.dfTokenBalance ?? 0,
  });

  const { state: depositState, executeDeposit, reset: resetDeposit } = useDepositSingleAsset({
    tokenAddress: positionData?.tokenAddress ?? '',
    targetPoolAddress: smartExitTarget?.suggestedPool ?? '',
    maxAmount: withdrawResult?.amount ?? 0,
  });

  // Fetch position data when modal opens
  useEffect(() => {
    if (!position || !smartExitTarget) return;

    async function fetchPositionData() {
      try {
        const server = getHorizonServer();
        const account = await server.accounts().accountId(position!.user_address).call();
        
        // Find native XLM balance
        const nativeBalance = account.balances.find(b => b.asset_type === 'native');
        const tokenBalance = nativeBalance ? parseFloat(nativeBalance.balance) : 0;

        // Try to get pool token addresses from the pool contract
        // pool_id format: "protocol:TOKEN_A/TOKEN_B" — try to resolve the actual contract addresses
        let lpTokenAddress = position!.pool_id;
        let tokenAddress = 'native';

        // For Soroswap pools, the pool_id is the LP contract address
        if (position!.pool_protocol === 'soroswap') {
          lpTokenAddress = position!.pool_id;
        }

        // For raws_amm pools, try querying the AMM contract for token addresses
        if (position!.pool_protocol === 'raws_amm') {
          try {
            const ammContractId = process.env.NEXT_PUBLIC_AMM_CONTRACT_ID ?? '';
            if (ammContractId) {
              const passphrase = Networks.PUBLIC;
              const rpcServer = getSorobanServer();
              const ammContract = new Contract(ammContractId);
              const op = ammContract.call('get_token_a');
              const simTx = new TransactionBuilder(
                await rpcServer.getAccount('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'),
                { fee: '0', networkPassphrase: passphrase }
              ).addOperation(op).setTimeout(0).build();
              const sim = await rpcServer.simulateTransaction(simTx);
              if ('result' in sim && sim.result?.retval) {
                tokenAddress = sim.result.retval.toString();
              }
            }
          } catch {
            // Fall back to default
          }
        }

        setPositionData({
          lpTokenAddress,
          tokenAddress,
          dfTokenBalance: position!.df_token_shares || tokenBalance,
        });
      } catch (err) {
        console.error('Failed to fetch position data:', err);
        toast.error('Failed to load position data', { id: 'smart-exit' });
      }
    }

    fetchPositionData();
  }, [position, smartExitTarget]);

  if (!smartExitTarget) return null;

  async function handleWithdraw() {
    try {
      await executeWithdraw();
      // Wait for confirmation
      if (withdrawState.phase === 'CONFIRMED') {
        setWithdrawResult({
          amount: parseFloat(withdrawState.amount),
          token: positionData?.tokenAddress ?? 'XLM',
        });
        setStep('DEPOSIT');
      }
    } catch (err) {
      toast.error(`Withdraw failed: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        id: 'smart-exit',
      });
    }
  }

  async function handleDeposit() {
    try {
      await executeDeposit();
      if (depositState.phase === 'CONFIRMED') {
        setStep('COMPLETE');
        toast.success('Position moved successfully!', { id: 'smart-exit' });
      }
    } catch (err) {
      toast.error(`Deposit failed: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        id: 'smart-exit',
      });
    }
  }

  function handleClose() {
    closeSmartExit();
    // Reset state for next time
    setStep('WITHDRAW');
    setWithdrawResult(null);
    resetWithdraw();
    resetDeposit();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
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

        {/* Pool Info */}
        <div className="bg-[#0D0B0B] rounded-[2px] p-3 space-y-2">
          {[
            ['Exit pool', currentPoolName],
            ['Move to', smartExitTarget.suggestedPool],
            ['Projected NEY', formatPct(smartExitTarget.projectedNey * 100)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="font-mono text-[9px] text-[#7A6A6A] uppercase tracking-wide">{label}</span>
              <span className="font-mono text-[10px] font-medium text-[#EDEBDD]">{value}</span>
            </div>
          ))}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-2">
          {(['WITHDRAW', 'DEPOSIT', 'COMPLETE'] as SmartExitStep[]).map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono ${
                step === s ? 'bg-[#810100] text-[#EDEBDD]' : 
                (['WITHDRAW', 'DEPOSIT', 'COMPLETE'].indexOf(step) > i ? 'bg-[#2A2020] text-[#7A6A6A]' : 'bg-[#0D0B0B] text-[#7A6A6A]')
              }`}>
                {['WITHDRAW', 'DEPOSIT', 'COMPLETE'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && (
                <div className={`w-12 h-[1px] mx-1 ${
                  ['WITHDRAW', 'DEPOSIT', 'COMPLETE'].indexOf(step) > i ? 'bg-[#810100]' : 'bg-[#2A2020]'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-[#0D0B0B] border border-[#2A2020] rounded-[2px] p-3">
          {step === 'WITHDRAW' && (
            <div className="space-y-3">
              <p className="font-mono text-[9px] text-[#7A6A6A] leading-relaxed">
                Step 1: Withdraw from current pool. This will return your LP tokens to your wallet.
              </p>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-[#7A6A6A]">Amount to withdraw:</span>
                <span className="text-[#EDEBDD]">{withdrawState.amount} dfTokens</span>
              </div>
              {withdrawState.errorMessage && (
                <p className="font-mono text-[9px] text-[#810100]">{withdrawState.errorMessage}</p>
              )}
            </div>
          )}

          {step === 'DEPOSIT' && (
            <div className="space-y-3">
              <p className="font-mono text-[9px] text-[#7A6A6A] leading-relaxed">
                Step 2: Deposit into the suggested pool. This will swap your tokens and add liquidity.
              </p>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-[#7A6A6A]">Amount to deposit:</span>
                <span className="text-[#EDEBDD]">{withdrawResult?.amount.toFixed(2)} {withdrawResult?.token}</span>
              </div>
              {depositState.errorMessage && (
                <p className="font-mono text-[9px] text-[#810100]">{depositState.errorMessage}</p>
              )}
            </div>
          )}

          {step === 'COMPLETE' && (
            <div className="space-y-2">
              <p className="font-mono text-[9px] text-[#7A6A6A] leading-relaxed">
                Your position has been successfully moved! You're now earning yield in the new pool.
              </p>
              <p className="font-mono text-[9px] text-[#810100]">
                This may take a few moments to reflect in your dashboard.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 font-mono text-xs text-[#7A6A6A] border border-[#2A2020] rounded-[2px] hover:border-[#810100] transition-colors"
          >
            {step === 'COMPLETE' ? 'Done' : 'Cancel'}
          </button>

          {step === 'WITHDRAW' && (
            <button
              onClick={handleWithdraw}
              disabled={!positionData || withdrawState.phase !== 'INPUTTING'}
              className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-wide bg-[#810100] text-[#EDEBDD] hover:bg-[#630000] transition-colors rounded-[2px] disabled:opacity-50"
            >
              {withdrawState.phase === 'INPUTTING' ? 'Withdraw' : 
               withdrawState.phase === 'SIMULATING' ? 'Simulating...' :
               withdrawState.phase === 'AWAITING_SIGNATURE' ? 'Awaiting Signature...' :
               withdrawState.phase === 'SUBMITTING' ? 'Submitting...' :
               withdrawState.phase === 'POLLING' ? 'Confirming...' :
               withdrawState.phase === 'CONFIRMED' ? 'Confirmed!' :
               'Error'}
            </button>
          )}

          {step === 'DEPOSIT' && (
            <button
              onClick={handleDeposit}
              disabled={depositState.phase !== 'INPUTTING'}
              className="flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-wide bg-[#810100] text-[#EDEBDD] hover:bg-[#630000] transition-colors rounded-[2px] disabled:opacity-50"
            >
              {depositState.phase === 'INPUTTING' ? 'Deposit' :
               depositState.phase === 'SIMULATING' ? 'Simulating...' :
               depositState.phase === 'AWAITING_SIGNATURE' ? 'Awaiting Signature...' :
               depositState.phase === 'SUBMITTING' ? 'Submitting...' :
               depositState.phase === 'POLLING' ? 'Confirming...' :
               depositState.phase === 'CONFIRMED' ? 'Confirmed!' :
               'Error'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
