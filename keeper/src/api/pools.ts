import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { TrackedPool } from '../types/index';
import { enrichPool } from '../services/poolService';

// Simple in-memory cache — refresh every 60 seconds
// Avoids hammering Supabase + Aquarius API on every frontend render
let poolsCache: { data: object[]; cachedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function poolsRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /pools
   *
   * Returns all active tracked pools enriched with live health data.
   * Supports optional query params:
   *   ?protocol=aquarius|soroswap|phoenix|raws_amm
   *   ?safe_mode=true|false
   *   ?min_ney=0.01  (filter pools below this NEY score)
   *
   * Response shape:
   * {
   *   pools: PoolWithHealth[],
   *   count: number,
   *   fetched_at: string,
   *   cache_hit: boolean
   * }
   */
  fastify.get<{
    Querystring: {
      protocol?:  string;
      safe_mode?: string;
      min_ney?:   string;
    }
  }>(
    '/pools',
    async (request, reply) => {
      const now = Date.now();

      // Return cache if fresh
      if (poolsCache && now - poolsCache.cachedAt < CACHE_TTL_MS) {
        return reply.send({
          pools:      poolsCache.data,
          count:      poolsCache.data.length,
          fetched_at: new Date(poolsCache.cachedAt).toISOString(),
          cache_hit:  true,
        });
      }

      // Fetch all active pools from Supabase
      let query = db
        .from('tracked_pools')
        .select('*')
        .eq('is_active', true);

      const { protocol, safe_mode } = request.query;
      if (protocol)   query = query.eq('protocol', protocol);
      if (safe_mode !== undefined) {
        query = query.eq('is_safe_mode', safe_mode === 'true');
      }

      const { data: pools, error } = await query;

      if (error) {
        return reply.status(500).send({
          statusCode: 500, error: 'DatabaseError', message: error.message,
        });
      }

      // Enrich all pools in parallel
      const enriched = await Promise.all(
        (pools as TrackedPool[]).map(enrichPool)
      );

      // Apply min_ney filter after enrichment
      const minNey = request.query.min_ney ? parseFloat(request.query.min_ney) : null;
      const filtered = minNey !== null
        ? enriched.filter((p) => p.ney_score !== null && p.ney_score >= minNey)
        : enriched;

      // Sort: GREEN first, then by NEY score descending
      filtered.sort((a, b) => {
        const statusOrder = { GREEN: 0, YELLOW: 1, RED: 2, RED_CRITICAL: 3, UNKNOWN: 4 };
        const statusDiff = (statusOrder[a.health_status] ?? 4) -
                           (statusOrder[b.health_status] ?? 4);
        if (statusDiff !== 0) return statusDiff;
        return (b.ney_score ?? -Infinity) - (a.ney_score ?? -Infinity);
      });

      // Update cache
      poolsCache = { data: filtered, cachedAt: now };

      return reply.send({
        pools:      filtered,
        count:      filtered.length,
        fetched_at: new Date().toISOString(),
        cache_hit:  false,
      });
    }
  );

  /**
   * GET /pools/:pool_id
   *
   * Returns a single pool with full snapshot history (last 48 periods = 24 hours).
   * Used by the pool detail modal in the frontend.
   */
  fastify.get<{ Params: { pool_id: string } }>(
    '/pools/:pool_id',
    async (request, reply) => {
      const { pool_id } = request.params;

      const [poolResult, snapshotsResult] = await Promise.all([
        db.from('tracked_pools').select('*').eq('pool_id', pool_id).single(),
        db
          .from('pool_snapshots')
          .select('*')
          .eq('pool_id', pool_id)
          .order('captured_at', { ascending: false })
          .limit(48),
      ]);

      if (poolResult.error || !poolResult.data) {
        return reply.status(404).send({
          statusCode: 404, error: 'NotFound',
          message: `Pool ${pool_id} not found`,
        });
      }

      const enriched = await enrichPool(poolResult.data as TrackedPool);

      return reply.send({
        pool:      enriched,
        snapshots: snapshotsResult.data ?? [],
        fetched_at: new Date().toISOString(),
      });
    }
  );
}
