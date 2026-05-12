export function totalCost(
  gasUsd: number | null,
  feesUsd: number | null,
  pnlUsd: number | null = null
): number {
  return (feesUsd ?? 0) + (gasUsd ?? 0) - (pnlUsd ?? 0);
}

export function costPerPoint(
  gasUsd: number | null,
  feesUsd: number | null,
  points: number | null,
  pnlUsd: number | null = null
): number | null {
  const cost = totalCost(gasUsd, feesUsd, pnlUsd);
  if (!points || points === 0) return null;
  return cost / points;
}

export function costPerMVolume(
  gasUsd: number | null,
  feesUsd: number | null,
  volumeUsd: number | null,
  pnlUsd: number | null = null
): number | null {
  const cost = totalCost(gasUsd, feesUsd, pnlUsd);
  if (!volumeUsd || volumeUsd === 0) return null;
  return cost / (volumeUsd / 1_000_000);
}

export interface AggregatedEntry {
  volume_usd: number;
  fees_usd: number;
  gas_usd: number;
  points: number;
  initial_liq_usd: number;
  pnl_usd: number;
}

export function aggregateEntries(
  entries: Array<{
    volume_usd: number | null;
    fees_usd: number | null;
    gas_usd: number | null;
    points: number | null;
    initial_liq_usd: number | null;
    pnl_usd?: number | null;
  }>
): AggregatedEntry {
  return entries.reduce<AggregatedEntry>(
    (acc, e) => ({
      volume_usd: acc.volume_usd + (e.volume_usd ?? 0),
      fees_usd: acc.fees_usd + (e.fees_usd ?? 0),
      gas_usd: acc.gas_usd + (e.gas_usd ?? 0),
      points: acc.points + (e.points ?? 0),
      initial_liq_usd: acc.initial_liq_usd + (e.initial_liq_usd ?? 0),
      pnl_usd: acc.pnl_usd + (e.pnl_usd ?? 0),
    }),
    { volume_usd: 0, fees_usd: 0, gas_usd: 0, points: 0, initial_liq_usd: 0, pnl_usd: 0 }
  );
}
