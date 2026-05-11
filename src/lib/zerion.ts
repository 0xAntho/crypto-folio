const ZERION_BASE = "https://api.zerion.io/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

function authHeader(): string {
  const key = process.env.ZERION_API_KEY ?? "";
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

async function zerionGet<T>(path: string): Promise<T> {
  const res = await fetch(`${ZERION_BASE}${path}`, {
    headers: { Authorization: authHeader(), accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Zerion ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export interface ZerionPortfolio {
  data: {
    attributes: {
      total: { positions: number };
      changes: { percent_1d: number | null };
    };
  };
}

export interface ZerionPosition {
  id: string;
  attributes: {
    name: string;
    symbol: string;
    quantity: { float: number };
    value: number | null;
    price: number | null;
    changes: { percent_1d: number | null } | null;
    fungible_info: { implementations: Array<{ chain_id: string }> };
  };
}

export interface ZerionPositionsResponse {
  data: ZerionPosition[];
}

export async function fetchPortfolio(address: string): Promise<ZerionPortfolio> {
  return zerionGet<ZerionPortfolio>(`/wallets/${address}/portfolio`);
}

export async function fetchPositions(address: string): Promise<ZerionPositionsResponse> {
  return zerionGet<ZerionPositionsResponse>(
    `/wallets/${address}/positions/?filter[position_types]=wallet&currency=usd&sort=value`
  );
}

export function isCacheStale(fetchedAt: number): boolean {
  return Date.now() - fetchedAt > CACHE_TTL_MS;
}
