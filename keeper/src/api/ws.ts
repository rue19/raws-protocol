import { FastifyInstance } from 'fastify';
import { subscribe } from '../services/realtimeService';

export async function wsRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /ws/positions/:address  (WebSocket)
   *
   * Upgrades HTTP connection to WebSocket.
   * Sends real-time updates whenever:
   *   - A position for this address changes (INSERT/UPDATE from Supabase Realtime)
   *   - An alert fires for this address
   *
   * Client sends: { type: 'ping' }  → Server responds: { type: 'pong' }
   * Server sends:
   *   { type: 'POSITION_UPDATE', event: 'INSERT'|'UPDATE', position: Position }
   *   { type: 'ALERT', alert: Alert }
   *   { type: 'connected', address: string, ts: string }
   *
   * Frontend usage:
   *   const ws = new WebSocket(`${process.env.NEXT_PUBLIC_API_WS_URL}/ws/positions/${address}`);
   */
  fastify.get(
    '/ws/positions/:address',
    { websocket: true },
    (socket: any, request: any) => {
      const { address } = request.params as { address: string };

      // Validate address format — close immediately if invalid
      if (!/^G[A-Z2-7]{55}$/.test(address)) {
        socket.send(JSON.stringify({
          type:    'error',
          message: 'Invalid Stellar address',
        }));
        socket.close(1008, 'Invalid address');
        return;
      }

      // Register this socket for Realtime broadcasts
      subscribe(address, socket);

      // Send connection confirmation
      socket.send(JSON.stringify({
        type:    'connected',
        address,
        ts:      new Date().toISOString(),
        message: 'Subscribed to position updates',
      }));

      // Handle ping/pong keepalive from frontend
      socket.on('message', (raw: any) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type?: string };
          if (msg.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong', ts: new Date().toISOString() }));
          }
        } catch {
          // Ignore malformed messages
        }
      });

      socket.on('error', (err: Error) => {
        console.error(`WS error for ${address}:`, err.message);
      });
    }
  );
}
