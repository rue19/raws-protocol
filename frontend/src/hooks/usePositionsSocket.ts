'use client';

import { useEffect, useRef } from 'react';
import { useStore }           from '@/lib/store';
import type { PositionWithNEY, Alert } from '@/types';

const WS_BASE = process.env.NEXT_PUBLIC_API_WS_URL ?? 'ws://localhost:3001';
const PING_INTERVAL_MS = 25_000;
const RECONNECT_DELAY_MS = 3_000;

export function usePositionsSocket(address: string | null) {
  const { updatePosition, addAlert } = useStore();
  const wsRef         = useRef<WebSocket | null>(null);
  const pingRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef  = useRef(true);

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
