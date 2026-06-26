import { FastifyInstance } from 'fastify';
import { db } from '../db';

export async function compoundLogRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /compound-log/:address
   *
   * Returns the full auto-compound history for a wallet address.
   * Supports pagination:
   *   ?limit=20 (default 20, max 100)
   *   ?offset=0
   *   ?pool_id=aquarius:XLM/USDC (optional filter)
   *
   * Response shape:
   * {
   *   address: string,
   *   logs: CompoundLog[],
   *   total_rewards_usd: number,
   *   total_compound_count: number,
   *   pagination: { limit, offset, has_more }
   * }
   */
  fastify.get<{
    Params:      { address: string };
    Querystring: { limit?: string; offset?: string; pool_id?: string };
  }>(
    '/compound-log/:address',
    async (request, reply) => {
      const { address }          = request.params;
      const limit  = Math.min(parseInt(request.query.limit  ?? '20'), 100);
      const offset = parseInt(request.query.offset ?? '0');
      const { pool_id }          = request.query;

      // Validate address format
      if (!/^G[A-Z2-7]{55}$/.test(address)) {
        return reply.status(400).send({
          statusCode: 400, error: 'InvalidAddress',
          message: 'Address must be a valid Stellar G... public key',
        });
      }

      let query = db
        .from('compound_log')
        .select('*', { count: 'exact' })
        .eq('user_address', address)
        .order('compounded_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (pool_id) query = query.eq('pool_id', pool_id);

      const { data: logs, error, count } = await query;

      if (error) {
        return reply.status(500).send({
          statusCode: 500, error: 'DatabaseError', message: error.message,
        });
      }

      // Sum total USD value of all rewards harvested (all time, not just this page)
      const { data: totals } = await db
        .from('compound_log')
        .select('rewards_usd_value')
        .eq('user_address', address);

      const totalRewardsUsd = (totals ?? [])
        .map((r: { rewards_usd_value: number | null }) => r.rewards_usd_value ?? 0)
        .reduce((sum: number, v: number) => sum + v, 0);

      return reply.send({
        address,
        logs:                  logs ?? [],
        total_rewards_usd:     totalRewardsUsd,
        total_compound_count:  count ?? 0,
        pagination: {
          limit,
          offset,
          has_more: offset + limit < (count ?? 0),
        },
      });
    }
  );
}
