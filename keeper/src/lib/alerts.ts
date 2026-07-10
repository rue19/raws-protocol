const knownOpenAlerts = new Set<string>();

export function setKnownOpenAlerts(keys: string[]): void {
  knownOpenAlerts.clear();
  for (const k of keys) knownOpenAlerts.add(k);
}

export async function triggerSmartExitAlert(input: {
  pool: { pool_id: string };
  position: { user_address: string };
  ney_score: number;
}): Promise<{ alert_type: string; pool_id: string; user_address: string; current_loss_rate: number; status: string }> {
  const key = `${input.pool.pool_id}:${input.position.user_address}`;
  if (knownOpenAlerts.has(key)) {
    return {
      alert_type: "SMART_EXIT",
      pool_id: input.pool.pool_id,
      user_address: input.position.user_address,
      current_loss_rate: input.ney_score,
      status: "SKIPPED_DUPLICATE",
    };
  }
  knownOpenAlerts.add(key);

  return {
    alert_type: "SMART_EXIT",
    pool_id: input.pool.pool_id,
    user_address: input.position.user_address,
    current_loss_rate: input.ney_score,
    status: "OPEN",
  };
}