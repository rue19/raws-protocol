const HORIZON_URL = process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

export class HorizonError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'HorizonError';
    this.statusCode = statusCode;
  }
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
        await new Promise((r) => setTimeout(r, retryAfter * 1000 * attempt));
        continue;
      }
      if (response.status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      if (!response.ok) throw new HorizonError(`Horizon ${response.status} for ${url}`, response.status);
      return response;
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new HorizonError(`Failed after ${maxRetries} retries: ${lastError?.message}`);
}

function toBigint(value: string | number): bigint {
  if (typeof value === 'string') return BigInt(value.split('.')[0]);
  return BigInt(value);
}

export async function getPoolReserves(poolId: string): Promise<{ reserveA: bigint; reserveB: bigint }> {
  const response = await fetchWithRetry(`${HORIZON_URL}/liquidity_pools/${poolId}`);
  const data = (await response.json()) as { reserves: [string, string] };
  return { reserveA: toBigint(data.reserves[0]), reserveB: toBigint(data.reserves[1]) };
}

export async function getFeeRevenueSince(poolId: string, sinceTimestamp: Date): Promise<bigint> {
  const response = await fetchWithRetry(`${HORIZON_URL}/liquidity_pools/${poolId}/effects?order=asc&limit=200`);
  const data = (await response.json()) as { _embedded: { records: { type: string; amount?: string; created_at: string }[] } };
  const sinceMs = sinceTimestamp.getTime();
  let totalFees = BigInt(0);
  for (const record of data._embedded.records) {
    if (new Date(record.created_at).getTime() < sinceMs) continue;
    if (record.type === 'liquidity_pool.trade' && record.amount) {
      const fee = Math.floor(parseFloat(record.amount) * 0.04);
      if (fee > 0) totalFees += BigInt(fee);
    }
  }
  return totalFees;
}

// ─── Client-side LP Balance Reads ──────────────────────────────────
// Read LP token balances directly from Horizon as fallback
// when the primary API is unavailable.

interface AccountResponse {
  balances: Array<{
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
    balance: string;
    contract?: string;
  }>;
}

/**
 * Read the user's LP token balance directly from Horizon.
 * Used for degraded mode when Supabase is down.
 */
export async function getUserLPBalance(
  userAddress: string,
  lpTokenAddress: string
): Promise<bigint> {
  try {
    const response = await fetchWithRetry(
      `${HORIZON_URL}/accounts/${userAddress}`
    );
    const data = (await response.json()) as AccountResponse;

    // Look for the LP token in the account's balances
    for (const balance of data.balances) {
      // For contract-backed tokens, check the contract address
      if (balance.contract === lpTokenAddress) {
        return toBigint(balance.balance);
      }
      // For classic assets, match by code/issuer
      if (balance.asset_code && `${balance.asset_code}:${balance.asset_issuer}` === lpTokenAddress) {
        return toBigint(balance.balance);
      }
    }

    return BigInt(0);
  } catch (err) {
    console.warn('[Horizon] Failed to read LP balance:', err);
    return BigInt(0);
  }
}

/**
 * Read the vault contract's DF token total supply via Soroban RPC simulation.
 * This is a read-only call that doesn't require signing.
 */
export async function getVaultTotalSupply(vaultContractId: string): Promise<bigint> {
  try {
    // Use Horizon's contract simulation endpoint
    const response = await fetchWithRetry(
      `${HORIZON_URL}/contracts/${vaultContractId}/invoke?fn=get_total_supply`
    );
    const data = (await response.json()) as { result?: string };
    return data.result ? toBigint(data.result) : BigInt(0);
  } catch {
    return BigInt(0);
  }
}
