import { RealtimeChannel } from '@supabase/supabase-js';
import { db } from '../db';
import { WebSocket } from 'ws';

// Map: user_address → Set of connected WebSocket clients
const subscribers = new Map<string, Set<WebSocket>>();

let positionsChannel: RealtimeChannel | null = null;
let alertsChannel:    RealtimeChannel | null = null;

/**
 * Register a WebSocket client to receive live updates for a wallet address.
 */
export function subscribe(address: string, socket: WebSocket): void {
  if (!subscribers.has(address)) {
    subscribers.set(address, new Set());
  }
  subscribers.get(address)!.add(socket);

  socket.on('close', () => {
    subscribers.get(address)?.delete(socket);
    if (subscribers.get(address)?.size === 0) {
      subscribers.delete(address);
    }
  });
}

/**
 * Broadcast a JSON payload to all WebSocket clients subscribed to an address.
 */
function broadcast(address: string, payload: object): void {
  const clients = subscribers.get(address);
  if (!clients) return;
  const message = JSON.stringify(payload);
  for (const socket of clients) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}

/**
 * Start Supabase Realtime subscriptions.
 * Call once on server startup.
 *
 * Listens for:
 * - INSERT/UPDATE on `positions` table → push to relevant wallet's WS clients
 * - INSERT on `alerts` table → push alert to relevant wallet's WS clients
 */
export function startRealtimeSubscriptions(): void {
  // ── Positions channel ──────────────────────────────────────────────────
  positionsChannel = db
    .channel('positions-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'positions' },
      (payload) => {
        const record = payload.new as { user_address?: string } | null;
        const address = record?.user_address;
        if (!address) return;

        broadcast(address, {
          type:      'POSITION_UPDATE',
          event:     payload.eventType,
          position:  payload.new,
        });
      }
    )
    .subscribe((status) => {
      console.log(`Positions Realtime: ${status}`);
    });

  // ── Alerts channel ─────────────────────────────────────────────────────
  alertsChannel = db
    .channel('alerts-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'alerts' },
      (payload) => {
        const record = payload.new as { user_address?: string } | null;
        const address = record?.user_address;
        if (!address) return;

        broadcast(address, {
          type:  'ALERT',
          alert: payload.new,
        });
      }
    )
    .subscribe((status) => {
      console.log(`Alerts Realtime: ${status}`);
    });
}

/**
 * Gracefully unsubscribe on shutdown.
 */
export async function stopRealtimeSubscriptions(): Promise<void> {
  if (positionsChannel) await db.removeChannel(positionsChannel);
  if (alertsChannel)    await db.removeChannel(alertsChannel);
}
