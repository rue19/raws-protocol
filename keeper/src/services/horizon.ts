import { config } from "../config";
import { logger } from "../lib/logger";

export class HorizonError extends Error {
  statusCode?: number;
  poolId?: string;
  constructor(message: string, statusCode?: number, poolId?: string) {
    super(message);
    this.name = "HorizonError";
    this.statusCode = statusCode;
    this.poolId = poolId;
  }
}

async function fetchWithRetry(
  url: string,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "1", 10);
        await new Promise((r) => setTimeout(r, retryAfter * 1000 * attempt));
        continue;
      }
      if (response.status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      if (!response.ok) {
        throw new HorizonError(
          `Horizon returned status ${response.status} for ${url}`,
          response.status
        );
      }
      return response;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw new HorizonError(
    `Failed after ${maxRetries} retries: ${lastError?.message}`
  );
}

function toBigint(value: string | number): bigint {
  if (typeof value === "string") {
    const parts = value.split(".");
    return BigInt(parts[0]);
  }
  return BigInt(value);
}

interface PoolReservesResponse {
  reserves: [string, string];
}

export async function getPoolReserves(
  poolId: string
): Promise<{ reserveA: bigint; reserveB: bigint }> {
  const url = `${config.HORIZON_URL}/liquidity_pools/${poolId}`;
  const response = await fetchWithRetry(url);
  const data = (await response.json()) as PoolReservesResponse;
  return {
    reserveA: toBigint(data.reserves[0]),
    reserveB: toBigint(data.reserves[1]),
  };
}

interface EffectEntry {
  type: string;
  amount?: string;
  created_at: string;
}

interface EffectsResponse {
  _embedded: {
    records: EffectEntry[];
  };
}

export async function getFeeRevenueSince(
  poolId: string,
  sinceTimestamp: Date
): Promise<bigint> {
  const url = `${config.HORIZON_URL}/liquidity_pools/${poolId}/effects?order=asc&limit=200`;
  const response = await fetchWithRetry(url);
  const data = (await response.json()) as EffectsResponse;
  const sinceMs = sinceTimestamp.getTime();
  let totalFees = BigInt(0);
  for (const record of data._embedded.records) {
    const createdAtMs = new Date(record.created_at).getTime();
    if (createdAtMs < sinceMs) continue;
    if (record.type === "liquidity_pool.trade" && record.amount) {
      const fee = Math.floor(parseFloat(record.amount) * 0.04);
      if (fee > 0) totalFees += BigInt(fee);
    }
  }
  return totalFees;
}