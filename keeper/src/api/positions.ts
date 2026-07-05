import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db';
import { Position, PositionWithNEY } from '../types/index';
import { calcIL, calcNEY } from '../lib/math';
import { getRecentSnapshots } from '../services/poolService';

export async function positionsRoutes(fastify: FastifyInstance): Promise<void> {

  // Schema for address param validation
  const paramsSchema = {
    type: 'object',
    required: ['address'],
    properties: {
      address: {
        type: 'string',
        minLength: 56,
        maxLength: 56,
        pattern: '^G[A-Z2-7]{55}$',   // Stellar G... address format
        description: 'Stellar wallet address (56-char Ed25519 public key)',
      },
    },
  };

  /**
   * GET /positions/:address
   *
   * Returns all active LP positions for the given Stellar wallet address.
   * Enriches each position with:
   *   - current_value_usd (from latest pool snapshot TVL proportional to shares)
   *   - il_percent (current impermanent loss)
   *   - ney_score (from latest watchdog cycle)
   *   - health_status
   *   - compound_count (how many times auto-compounded)
   *   - last_compounded_at
   *
   * Response shape:
   * {
   *   address: string,
   *   positions: PositionWithNEY[],
   *   total_value_usd: number | null,
   *   fetched_at: string (ISO timestamp)
   * }
   */
  fastify.get<{
    Params: { address: string }
  }>(
    '/positions/:address',
    { schema: { params: paramsSchema } },
    async (request, reply) => {
      const { address } = request.params;

      // 1. Fetch all active positions for this address
      const { data: positions, error: posErr } = await db
        .from('positions')
        .select('*')
        .eq('user_address', address)
        .eq('is_active', true)
        .order('entry_timestamp', { ascending: false });

      if (posErr) {
        return reply.status(500).send({
          statusCode: 500,
          error: 'DatabaseError',
          message: posErr.message,
        });
      }

      if (!positions || positions.length === 0) {
        return reply.send({
          address,
          positions:       [],
          total_value_usd: null,
          fetched_at:      new Date().toISOString(),
        });
      }

      // 2. Enrich each position
      const enriched = await Promise.all(
        (positions as Position[]).map(async (pos): Promise<PositionWithNEY> => {
          const [snapshots, compoundData] = await Promise.all([
            getRecentSnapshots(pos.pool_id, 1),
            db
              .from('compound_log')
              .select('id, compounded_at')
              .eq('position_id', pos.id)
              .order('compounded_at', { ascending: false })
              .limit(1),
          ]);

          const snap     = snapshots[0] ?? null;
          const currentRatio = snap ? snap.price_ratio : pos.entry_price_ratio;
          const ilDecimal    = calcIL(pos.entry_price_ratio, currentRatio);

          // compound_log count
          const { count: compoundCount } = await db
            .from('compound_log')
            .select('id', { count: 'exact', head: true })
            .eq('position_id', pos.id);

          return {
            ...pos,
            current_value_usd:  snap?.total_tvl_usd ?? null,
            il_percent:         ilDecimal * 100,
            fee_earned_usd:     null,  // computed by watchdog — pulled from snapshot
            ney_score:          snap?.ney_score ?? null,
            health_status:      snap?.health_status ?? 'UNKNOWN',
            compound_count:     compoundCount ?? 0,
            last_compounded_at: compoundData.data?.[0]?.compounded_at ?? null,
          };
        })
      );

      // 3. Sum total portfolio value
      const totalValueUsd = enriched
        .map((p) => p.current_value_usd)
        .filter((v): v is number => v !== null)
        .reduce((sum, v) => sum + v, 0);

      return reply.send({
        address,
        positions:       enriched,
        total_value_usd: enriched.some((p) => p.current_value_usd !== null)
                           ? totalValueUsd
                           : null,
        fetched_at: new Date().toISOString(),
      });
    }
  );
}
