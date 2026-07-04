const AQUARIUS_API = process.env.AQUARIUS_API_URL ?? 'https://api.aqua.network/api/v1';

export async function getPendingRewards(lpAddress: string): Promise<bigint> {
  try {
    const response = await fetch(`${AQUARIUS_API}/lp/${lpAddress}/rewards`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return BigInt(0);
    const data = (await response.json()) as { rewards?: string };
    return BigInt(data.rewards || '0');
  } catch {
    return BigInt(0);
  }
}
