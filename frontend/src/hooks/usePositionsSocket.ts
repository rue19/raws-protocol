'use client';

import { useEffect, useRef } from 'react';
import { useStore }           from '@/lib/store';
import { api }                from '@/lib/api';
import type { PositionWithNEY, Alert } from '@/types';

const WS_BASE = process.env.NEXT_PUBLIC_API_WS_URL ?? 'ws://localhost:3001';
const PING_INTERVAL_MS = 25_000;
const RECONNECT_DELAY_MS = 3_000;
const FETCH_TIMEOUT_MS = 10_000;

export function usePositionsSocket(address: string | null) {
  const { setPositions, updatePosition, addAlert, setDegradedMode } = useStore();
  const wsRef         = useRef<WebSocket | null>(null);
  const pingRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef  = useRef(true);

  // Initial fetch with degraded mode fallback
  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    async function fetchInitial() {
      try {
        const result = await api.getPositions(address!);
        if (!cancelled && result.positions) {
          setPositions(result.positions);
          setDegradedMode(false);
        }
      } catch {
        // Primary API failed — try chain fallback
        try {
          const chainResult = await api.getPositionsFromChain(address!);
          if (!cancelled && chainResult.positions) {
            // Map chain positions to PositionWithNEY shape (best-effort)
            const mapped: PositionWithNEY[] = chainResult.positions.map((cp, i) => ({
              id: `chain-${cp.userAddress}-${i}`,
              user_address: cp.userAddress,
              pool_id: cp.lpTokenAddress,
              pool_protocol: 'raws_amm' as const,
              vault_mode: 'YieldMode' as const,
              lp_token_amount: cp.lpTokenAmount,
              df_token_shares: cp.dfTokenShares,
              entry_price_ratio: 1,
              entry_timestamp: new Date().toISOString(),
              is_active: true,
              tx_hash: null,
              created_at: chainResult.fetched_at,
              updated_at: chainResult.fetched_at,
              current_value_usd: null,
              il_percent: 0,
              fee_earned_usd: null,
              ney_score: null,
              health_status: 'UNKNOWN',
              compound_count: 0,
              last_compounded_at: null,
            }));
            setPositions(mapped);
            setDegradedMode(true);
          }
        } catch {
          // Both sources failed
          if (!cancelled) {
            setPositions([]);
            setDegradedMode(true);
          }
        }
      }
    }

    fetchInitial();

    return () => { cancelled = true; };
  }, [address, setPositions, setDegradedMode]);

  // WebSocket connection
  useEffect(() => {
    isMountedRef.current = true;
    if (!address) return;

    function connect() {
      if (!isMountedRef.current) return;
      const ws = new WebSocket(`${WS_BASE}/ws/positions/${address}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected for', address);
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, PING_INTERVAL_MS);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            position?: PositionWithNEY;
            alert?: Alert;
          };

          if (msg.type === 'POSITION_UPDATE' && msg.position) {
            updatePosition(msg.position);
          }
          if (msg.type === 'ALERT' && msg.alert) {
            addAlert(msg.alert);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (pingRef.current) clearInterval(pingRef.current);
        if (isMountedRef.current) {
          reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = (err) => {
        console.warn('[WS] Error:', err);
        ws.close();
      };
    }

    connect();

    return () => {
      isMountedRef.current = false;
      if (pingRef.current)      clearInterval(pingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [address, updatePosition, addAlert]);
}
