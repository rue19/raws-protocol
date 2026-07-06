import { config } from "../config";
import { logger } from "../lib/logger";

// ─── Types ─────────────────────────────────────────────────────────

export interface OnChainPosition {
  userAddress: string;
  lpTokenAddress: string;
  dfTokenShares: number;
  lpTokenAmount: number;
}

// ─── Horizon Error ──────────────────────────────────────────────────

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
  const url = `${config.STELLAR_HORIZON_URL}/liquidity_pools/${poolId}`;
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
  const url = `${config.STELLAR_HORIZON_URL}/liquidity_pools/${poolId}/effects?order=asc&limit=200`;
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

// ─── Contract Event Indexer ────────────────────────────────────────
// Scans Horizon contract events for Deposit/Withdraw/deposit_safe_mode
// to reconstruct positions when Supabase is unavailable.

interface ContractEvent {
  type: string;
  contract: string;
  paging_token: string;
  ledger: string;
  data?: string;
  data_xdr?: string;
  topics?: string[];
}

interface ContractEventsResponse {
  _embedded: {
    records: ContractEvent[];
  };
}

function decodeEventTopic(topic: string): string {
  // Horizon returns contract event topics as base64-encoded xdr.ScVal.
  // For now, we match on the event topic string representations.
  return topic;
}

export async function fetchContractEvents(
  contractId: string,
  cursor?: string
): Promise<ContractEvent[]> {
  let url = `${config.STELLAR_HORIZON_URL}/contracts/${contractId}/events?limit=200&order=asc`;
  if (cursor) {
    url += `&cursor=${cursor}`;
  }

  const response = await fetchWithRetry(url);
  const data = (await response.json()) as ContractEventsResponse;
  return data._embedded.records;
}

/**
 * Rebuild a user's position from on-chain events.
 * Scans all contract events for the user's address to reconstruct
 * the current state (net deposits - withdrawals).
 */
export async function reconstructPositionFromEvents(
  userAddress: string
): Promise<OnChainPosition[]> {
  const vaultContractId = config.VAULT_CONTRACT_ID;

  try {
    // Fetch contract events (we'll filter by user in post-processing)
    const events = await fetchContractEvents(vaultContractId);

    // Track net deposits per (user, lp_token)
    const positions = new Map<string, {
      userAddress: string;
      lpTokenAddress: string;
      dfTokenShares: number;
      lpTokenAmount: number;
    }>();

    for (const event of events) {
      // Horizon contract events have topics that identify the event type.
      // We look for our custom event types: deposit, withdraw, harvest, deposit_sa
      const topicsStr = (event.topics || []).join(" ");

      // Basic heuristic: if the event data contains the user address, process it
      const dataStr = event.data || "";
      if (!dataStr.includes(userAddress)) continue;

      // Event matching by topic keywords
      const isDeposit = topicsStr.includes("deposit") || topicsStr.includes("emit_deposit");
      const isWithdraw = topicsStr.includes("withdraw") || topicsStr.includes("emit_withdraw");
      const isHarvest = topicsStr.includes("harvest") || topicsStr.includes("emit_harvest");
      const isDepositSa = topicsStr.includes("deposit_sa") || topicsStr.includes("emit_deposit_single_asset");

      if (!isDeposit && !isWithdraw && !isHarvest && !isDepositSa) continue;

      // Extract amounts from event data (Horizon returns base64-encoded XDR).
      // For a production implementation, this would decode XDR.
      // For now, we log and track based on event type.
      const key = `${userAddress}:${vaultContractId}`;

      if (!positions.has(key)) {
        positions.set(key, {
          userAddress,
          lpTokenAddress: vaultContractId,
          dfTokenShares: 0,
          lpTokenAmount: 0,
        });
      }

      const pos = positions.get(key)!;

      if (isDeposit || isDepositSa) {
        // Deposits increase dfTokens and lpAmount
        pos.dfTokenShares += 1; // simplified — in production, decode XDR amount
        pos.lpTokenAmount += 1;
      } else if (isWithdraw) {
        pos.dfTokenShares -= 1;
        pos.lpTokenAmount -= 1;
      }
      // harvest doesn't change user's position
    }

    return Array.from(positions.values());
  } catch (err) {
    logger.error({ userAddress, err }, "failed to reconstruct position from chain events");
    return [];
  }
}

/**
 * Reconstruct all active positions from chain events.
 * Used as fallback when Supabase is unavailable.
 */
export async function reconstructAllPositionsFromChain(): Promise<OnChainPosition[]> {
  const vaultContractId = config.VAULT_CONTRACT_ID;

  try {
    const events = await fetchContractEvents(vaultContractId);
    const positions = new Map<string, {
      userAddress: string;
      lpTokenAddress: string;
      dfTokenShares: number;
      lpTokenAmount: number;
    }>();

    for (const event of events) {
      const topicsStr = (event.topics || []).join(" ");
      const dataStr = event.data || "";

      const isDeposit = topicsStr.includes("deposit") || topicsStr.includes("emit_deposit");
      const isWithdraw = topicsStr.includes("withdraw") || topicsStr.includes("emit_withdraw");

      if (!isDeposit && !isWithdraw) continue;

      // Extract user address from event data (simplified heuristic)
      // In production, decode the XDR ScVal to get exact amounts
      const userMatch = dataStr.match(/G[A-Z0-9]{55}/);
      if (!userMatch) continue;

      const userAddress = userMatch[0];
      const key = `${userAddress}:${vaultContractId}`;

      if (!positions.has(key)) {
        positions.set(key, {
          userAddress,
          lpTokenAddress: vaultContractId,
          dfTokenShares: 0,
          lpTokenAmount: 0,
        });
      }

      const pos = positions.get(key)!;
      if (isDeposit) {
        pos.dfTokenShares += 1;
        pos.lpTokenAmount += 1;
      } else if (isWithdraw) {
        pos.dfTokenShares = Math.max(0, pos.dfTokenShares - 1);
        pos.lpTokenAmount = Math.max(0, pos.lpTokenAmount - 1);
      }
    }

    return Array.from(positions.values());
  } catch (err) {
    logger.error({ err }, "failed to reconstruct all positions from chain events");
    return [];
  }
}
