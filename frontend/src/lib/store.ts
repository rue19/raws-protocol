import { create }                          from 'zustand';
import type { PositionWithNEY, Alert }     from '@/types';

interface RawsStore {
  // Wallet
  walletAddress:    string | null;
  setWalletAddress: (addr: string | null) => void;

  // Positions
  positions:     PositionWithNEY[];
  setPositions:  (p: PositionWithNEY[]) => void;
  updatePosition:(updated: PositionWithNEY) => void;

  // Degraded mode (Supabase down, using chain fallback)
  isDegradedMode: boolean;
  setDegradedMode:(v: boolean) => void;

  // Alerts
  alerts:       Alert[];
  setAlerts:    (a: Alert[]) => void;
  addAlert:     (a: Alert) => void;
  dismissAlert: (id: string) => void;

  // UI state
  isLoadingPositions: boolean;
  setLoadingPositions:(v: boolean) => void;

  // Smart exit modal
  smartExitTarget: { positionId: string; suggestedPool: string; projectedNey: number } | null;
  openSmartExit:   (target: RawsStore['smartExitTarget']) => void;
  closeSmartExit:  () => void;
}

export const useStore = create<RawsStore>((set) => ({
  walletAddress:    null,
  setWalletAddress: (addr) => set({ walletAddress: addr }),

  positions:    [],
  setPositions: (positions) => set({ positions }),
  updatePosition: (updated) =>
    set((s) => ({
      positions: s.positions.map((p) =>
        p.id === updated.id ? updated : p
      ),
    })),

  isDegradedMode:  false,
  setDegradedMode: (v) => set({ isDegradedMode: v }),

  alerts:       [],
  setAlerts:    (alerts) => set({ alerts }),
  addAlert:     (alert) =>
    set((s) => ({ alerts: [alert, ...s.alerts] })),
  dismissAlert: (id) =>
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),

  isLoadingPositions:  false,
  setLoadingPositions: (v) => set({ isLoadingPositions: v }),

  smartExitTarget: null,
  openSmartExit:   (target) => set({ smartExitTarget: target }),
  closeSmartExit:  () => set({ smartExitTarget: null }),
}));
