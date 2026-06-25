import { config } from "../config";
import { logger } from "../lib/logger";

export async function getPendingRewards(lpAddress: string): Promise<bigint> {
  try {
    const url = `${config.AQUARIUS_API_URL}/lp/${lpAddress}/rewards`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      logger.warn({ lpAddress, status: response.status }, "Aquarius rewards lookup failed");
      return BigInt(0);
    }
    const data: { rewards?: string } = await response.json() as { rewards?: string };
    return BigInt(data.rewards || "0");
  } catch (err) {
    logger.error({ lpAddress, err }, "Aquarius API error — treating as zero rewards");
    return BigInt(0);
  }
}