import { FastifyInstance } from 'fastify';
import { db } from '../db';

export async function alertsRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * POST /alerts/subscribe
   *
   * Register a wallet address to receive alerts via Telegram.
   * Body: { address: string, telegram_chat_id: string }
   *
   * Stores chat_id in a `user_preferences` table (create below).
   * The keeper reads this table when firing RED×3 alerts.
   *
   * Response: { success: true, address, telegram_linked: boolean }
   */
  fastify.post<{
    Body: { address: string; telegram_chat_id: string }
  }>(
    '/alerts/subscribe',
    {
      schema: {
        body: {
          type: 'object',
          required: ['address', 'telegram_chat_id'],
          properties: {
            address:          { type: 'string', minLength: 56, maxLength: 56 },
            telegram_chat_id: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { address, telegram_chat_id } = request.body;

      // Validate Stellar address format
      if (!/^G[A-Z2-7]{55}$/.test(address)) {
        return reply.status(400).send({
          statusCode: 400, error: 'InvalidAddress',
          message: 'Must be a valid Stellar G... public key',
        });
      }

      // Upsert into user_preferences (address is unique key)
      const { error } = await db
        .from('user_preferences')
        .upsert(
          { user_address: address, telegram_chat_id, updated_at: new Date().toISOString() },
          { onConflict: 'user_address' }
        );

      if (error) {
        return reply.status(500).send({
          statusCode: 500, error: 'DatabaseError', message: error.message,
        });
      }

      return reply.send({
        success:          true,
        address,
        telegram_linked:  true,
        message:          'You will now receive RED×3 pool alerts on Telegram.',
      });
    }
  );

  /**
   * GET /alerts/:address
   *
   * Returns the last 20 unread alerts for a wallet address.
   * Frontend polls this on mount to show the alert banner.
   */
  fastify.get<{ Params: { address: string } }>(
    '/alerts/:address',
    async (request, reply) => {
      const { address } = request.params;

      const { data, error } = await db
        .from('alerts')
        .select('*')
        .eq('user_address', address)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return reply.status(500).send({
          statusCode: 500, error: 'DatabaseError', message: error.message,
        });
      }

      return reply.send({ address, alerts: data ?? [], count: data?.length ?? 0 });
    }
  );

  /**
   * PATCH /alerts/:id/read
   *
   * Mark a single alert as read. Called by frontend when user dismisses alert.
   */
  fastify.patch<{ Params: { id: string } }>(
    '/alerts/:id/read',
    async (request, reply) => {
      const { id } = request.params;

      const { error } = await db
        .from('alerts')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        return reply.status(500).send({
          statusCode: 500, error: 'DatabaseError', message: error.message,
        });
      }

      return reply.send({ success: true, id });
    }
  );
}
