const ZERION_BASE = "https://api.zerion.io/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

function authHeader(): string {
  const key = process.env.ZERION_API_KEY ?? "";
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

async function zerionGet<T>(path: string, attempt = 0): Promise<T> {
  const res = await fetch(`${ZERION_BASE}${path}`, {
    headers: { Authorization: authHeader(), accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (res.status === 429 && attempt < 3) {
    const wait = (attempt + 1) * 2000;
    await new Promise((r) => setTimeout(r, wait));
    return zerionGet<T>(path, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Zerion ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface ZerionPortfolio {
  data: {
    attributes: {
      total: { positions: number };
      changes: { percent_1d: number | null };
      positions_distribution_by_type: {
        wallet: number;
        deposited: number;
        borrowed: number;
        locked: number;
        staked: number;
      };
      positions_distribution_by_chain: Record<string, number>;
    };
  };
}

export interface ZerionPosition {
  id: string;
  attributes: {
    name: string;
    quantity: { float: number };
    value: number | null;
    price: number | null;
    changes: { percent_1d: number | null } | null;
    fungible_info: {
      name: string;
      symbol: string;
      implementations: Array<{ chain_id: string }>;
    };
  };
  relationships: {
    chain: { data: { id: string } };
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

export interface ZerionDefiPosition {
  id: string;
  attributes: {
    position_type: "deposit" | "loan" | "staked" | "locked" | "reward" | "investment";
    value: number | null;
    quantity: { float: number };
    price: number | null;
    fungible_info: { name: string; symbol: string };
    application_metadata: { name: string; icon: { url: string } | null } | null;
  };
  relationships: {
    chain: { data: { id: string } };
  };
}

export interface ZerionDefiPositionsResponse {
  data: ZerionDefiPosition[];
}

export async function fetchDefiPositions(address: string): Promise<ZerionDefiPositionsResponse> {
  return zerionGet<ZerionDefiPositionsResponse>(
    `/wallets/${address}/positions/?filter[positions]=only_complex&currency=usd&sort=-value`
  );
}

interface ZerionFungibleHit {
  id: string;
  attributes: {
    name: string;
    symbol: string;
    market_data: {
      price: number | null;
      changes: { percent_1d: number | null } | null;
    } | null;
  };
}

export async function searchFungiblePrice(
  symbol: string,
  chainId: string
): Promise<{ name: string; price: number | null } | null> {
  try {
    const res = await zerionGet<{ data: ZerionFungibleHit[] }>(
      `/fungibles?filter[search_query]=${encodeURIComponent(symbol)}&filter[chain_id]=${encodeURIComponent(chainId)}&currency=usd`
    );
    const hit = res.data[0];
    if (!hit) return null;
    return { name: hit.attributes.name, price: hit.attributes.market_data?.price ?? null };
  } catch {
    return null;
  }
}

export function isCacheStale(fetchedAt: number): boolean {
  return Date.now() - fetchedAt > CACHE_TTL_MS;
}
