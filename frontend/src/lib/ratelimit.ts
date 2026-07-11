function createInMemoryLimiter() {
  const hits = new Map<string, number[]>();
  const WINDOW_MS = 60_000;
  const LIMIT = 60;

  return {
    limit: async (key: string) => {
      const now = Date.now();
      const timestamps = hits.get(key) ?? [];
      const recent = timestamps.filter((t) => now - t < WINDOW_MS);
      recent.push(now);
      hits.set(key, recent);
      return { success: recent.length <= LIMIT };
    },
  };
}

function createUpstashLimiter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Ratelimit } = require('@upstash/ratelimit');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require('@upstash/redis');

  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: false,
  });
}

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
export const ratelimit = hasUpstash ? createUpstashLimiter() : createInMemoryLimiter();
