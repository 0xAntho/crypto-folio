const EXT_BASE = "https://api.starknet.extended.exchange/api/v1";
const PAGE_SIZE = 500;

function apiKey(): string {
  const key = process.env.EXTENDED_API_KEY;
  if (!key) throw new Error("EXTENDED_API_KEY is not set");
  return key;
}

async function extGet<T>(path: string): Promise<T> {
  const res = await fetch(`${EXT_BASE}${path}`, {
    headers: { "X-Api-Key": apiKey() },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Extended ${res.status} on ${path}: ${text}`);
  }
  return res.json();
}

interface TradesResponse {
  status: string;
  data: { value: string; fee: string }[];
  pagination: { cursor: number; count: number };
}

interface PositionsResponse {
  status: string;
  data: { realisedPnl: string }[];
  pagination: { cursor: number; count: number };
}

async function fetchAllTrades(): Promise<{ value: string; fee: string }[]> {
  const all: { value: string; fee: string }[] = [];
  let cursor: number | null = null;
  let page = 0;

  while (true) {
    const qs = cursor != null
      ? `?limit=${PAGE_SIZE}&cursor=${cursor}`
      : `?limit=${PAGE_SIZE}`;
    const res = await extGet<TradesResponse>(`/user/trades${qs}`);
    page++;
    console.log(`[ext trades] page ${page}: ${res.data.length} trades, cursor=${cursor}`);
    all.push(...res.data);
    if (res.data.length < PAGE_SIZE) break;
    cursor = res.pagination.cursor;
  }

  console.log(`[ext trades] total: ${all.length} trades across ${page} pages`);
  return all;
}

async function fetchAllPositions(): Promise<{ realisedPnl: string }[]> {
  const all: { realisedPnl: string }[] = [];
  let cursor: number | null = null;
  let page = 0;

  while (true) {
    const qs = cursor != null
      ? `?limit=${PAGE_SIZE}&cursor=${cursor}`
      : `?limit=${PAGE_SIZE}`;
    const res = await extGet<PositionsResponse>(`/user/positions/history${qs}`);
    page++;
    console.log(`[ext positions] page ${page}: ${res.data.length} positions, cursor=${cursor}`);
    all.push(...res.data);
    if (res.data.length < PAGE_SIZE) break;
    cursor = res.pagination.cursor;
  }

  console.log(`[ext positions] total: ${all.length} positions across ${page} pages`);
  return all;
}

export interface ExtendedStats {
  volume_usd: number;
  fees_usd: number;
  pnl_usd: number;
}

export async function fetchExtendedStats(): Promise<ExtendedStats> {
  const [trades, positions] = await Promise.all([
    fetchAllTrades(),
    fetchAllPositions(),
  ]);

  const volume_usd = trades.reduce((s, t) => s + parseFloat(t.value), 0);
  const fees_usd = trades.reduce((s, t) => s + parseFloat(t.fee), 0);
  const pnl_usd = positions.reduce((s, p) => s + parseFloat(p.realisedPnl), 0);

  console.log(`[ext sync] volume_usd=${volume_usd}, fees_usd=${fees_usd}, pnl_usd=${pnl_usd}`);
  return { volume_usd, fees_usd, pnl_usd };
}
