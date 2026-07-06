import { config } from "../config";
import { logger } from "../lib/logger";
import { xdr, Address } from "@stellar/stellar-base";

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

/**
 * Decode a base64 XDR ScVal and extract an i128 amount.
 * Returns null if decoding fails or the value is not an i128.
 */
function decodeXdrI128(base64Xdr: string): bigint | null {
  try {
    const buf = Buffer.from(base64Xdr, "base64");
    const scVal = xdr.ScVal.fromXDR(buf);
    // i128 ScVal has a 128-bit body
    if (scVal.switch().name === "scvI128") {
      const parts = scVal.i128();
      const hi = BigInt(parts.hi().toString());
      const lo = BigInt(parts.lo().toString());
      return (hi << BigInt(64)) | lo;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decode a base64 XDR ScVal and extract an address.
 * Returns null if decoding fails or the value is not an address.
 */
function decodeXdrAddress(base64Xdr: string): string | null {
  try {
    const buf = Buffer.from(base64Xdr, "base64");
    const scVal = xdr.ScVal.fromXDR(buf);
    if (scVal.switch().name === "scvAddress") {
      const addr = Address.fromScAddress(scVal.address());
      return addr.toString();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Try to extract the user address from event data XDR.
 * Our events emit (user: Address, lp_token: Address, amount: i128).
 */
function extractEventFields(dataXdr: string): { user?: string; amount?: bigint } {
  try {
    const buf = Buffer.from(dataXdr, "base64");
    const scVal = xdr.ScVal.fromXDR(buf);
    // The event data is typically a Vec of ScVals
    if (scVal.switch().name === "scvVec") {
      const items = scVal.vec();
      if (items && items.length >= 2) {
        const user = decodeXdrAddress(
          items[0].toXDR().toString("base64")
        );
        const amount = decodeXdrI128(
          items.length >= 3 ? items[2].toXDR().toString("base64") : items[1].toXDR().toString("base64")
        );
        return { user: user ?? undefined, amount: amount ?? undefined };
      }
    }
    return {};
  } catch {
    return {};
  }
}

function decodeEventTopic(topic: string): string {
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
 * Uses XDR decoding to extract real amounts from contract events.
 */
export async function reconstructPositionFromEvents(
  userAddress: string
): Promise<OnChainPosition[]> {
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

      // Decode user address and amount from XDR
      let eventUser = userAddress;
      let amount = 0;
      if (event.data_xdr) {
        const fields = extractEventFields(event.data_xdr);
        if (fields.user) eventUser = fields.user;
        if (fields.amount !== undefined) amount = Number(fields.amount);
      }

      if (eventUser !== userAddress) continue;

      const isDeposit = topicsStr.includes("deposit") || topicsStr.includes("emit_deposit");
      const isWithdraw = topicsStr.includes("withdraw") || topicsStr.includes("emit_withdraw");
      const isDepositSa = topicsStr.includes("deposit_sa") || topicsStr.includes("emit_deposit_single_asset");

      if (!isDeposit && !isWithdraw && !isDepositSa) continue;
      if (amount === 0) continue;

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
        pos.dfTokenShares += amount;
        pos.lpTokenAmount += amount;
      } else if (isWithdraw) {
        pos.dfTokenShares = Math.max(0, pos.dfTokenShares - amount);
        pos.lpTokenAmount = Math.max(0, pos.lpTokenAmount - amount);
      }
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
      const isDeposit = topicsStr.includes("deposit") || topicsStr.includes("emit_deposit");
      const isWithdraw = topicsStr.includes("withdraw") || topicsStr.includes("emit_withdraw");

      if (!isDeposit && !isWithdraw) continue;

      let userAddr: string | null = null;
      let amount = 0;
      if (event.data_xdr) {
        const fields = extractEventFields(event.data_xdr);
        if (fields.user) userAddr = fields.user;
        if (fields.amount !== undefined) amount = Number(fields.amount);
      }

      if (!userAddr || amount === 0) continue;

      const key = `${userAddr}:${vaultContractId}`;
      if (!positions.has(key)) {
        positions.set(key, {
          userAddress: userAddr,
          lpTokenAddress: vaultContractId,
          dfTokenShares: 0,
          lpTokenAmount: 0,
        });
      }

      const pos = positions.get(key)!;
      if (isDeposit) {
        pos.dfTokenShares += amount;
        pos.lpTokenAmount += amount;
      } else if (isWithdraw) {
        pos.dfTokenShares = Math.max(0, pos.dfTokenShares - amount);
        pos.lpTokenAmount = Math.max(0, pos.lpTokenAmount - amount);
      }
    }

    return Array.from(positions.values());
  } catch (err) {
    logger.error({ err }, "failed to reconstruct all positions from chain events");
    return [];
  }
}
