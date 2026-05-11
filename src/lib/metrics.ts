export function costPerPoint(
  gasUsd: number | null,
  feesUsd: number | null,
  points: number | null
): number | null {
  const cost = (gasUsd ?? 0) + (feesUsd ?? 0);
  if (!points || points === 0) return null;
  return cost / points;
}

export function costPerMVolume(
  gasUsd: number | null,
  feesUsd: number | null,
  volumeUsd: number | null
): number | null {
  const cost = (gasUsd ?? 0) + (feesUsd ?? 0);
  if (!volumeUsd || volumeUsd === 0) return null;
  return cost / (volumeUsd / 1_000_000);
}

export function totalCost(gasUsd: number | null, feesUsd: number | null): number {
  return (gasUsd ?? 0) + (feesUsd ?? 0);
}

export interface AggregatedEntry {
  volume_usd: number;
  fees_usd: number;
  gas_usd: number;
  points: number;
  initial_liq_usd: number;
}

export function aggregateEntries(
  entries: Array<{
    volume_usd: number | null;
    fees_usd: number | null;
    gas_usd: number | null;
    points: number | null;
    initial_liq_usd: number | null;
  }>
): AggregatedEntry {
  return entries.reduce<AggregatedEntry>(
    (acc, e) => ({
      volume_usd: (acc.volume_usd ?? 0) + (e.volume_usd ?? 0),
      fees_usd: (acc.fees_usd ?? 0) + (e.fees_usd ?? 0),
      gas_usd: (acc.gas_usd ?? 0) + (e.gas_usd ?? 0),
      points: (acc.points ?? 0) + (e.points ?? 0),
      initial_liq_usd: (acc.initial_liq_usd ?? 0) + (e.initial_liq_usd ?? 0),
    }),
    { volume_usd: 0, fees_usd: 0, gas_usd: 0, points: 0, initial_liq_usd: 0 }
  );
}
