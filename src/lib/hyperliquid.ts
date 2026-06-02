const HL_BASE = "https://api.hyperliquid.xyz";
const PAGE_SIZE = 2000;

// --- Spot + account holdings ---

interface SpotBalance { coin: string; hold: string; total: string; entryNtl: string }
interface SpotToken { name: string; index: number; tokenId: string }
interface SpotMeta { tokens: SpotToken[] }
interface TokenDetails { midPx: string | null; prevDayPx: string | null }
interface ClearinghouseState { marginSummary: { accountValue: string } }
type DelegatorState = Array<{ validator: string; amount: string }>;
interface VaultDetails {
  name?: string;
  followerState?: { vaultEquity?: string };
}

// Stablecoins that should always be priced at $1 regardless of spot midPx
const STABLECOINS = new Set(["USDe", "USDh", "USDT", "DAI", "USDY", "USDXL"]);

const HLP_VAULT = "0xdfc24b077bc1425ad1dea75bcb6f8158e10df303";

export interface HLSpotPosition {
  symbol: string;
  qty: number;
  price: number | null;
  value: number | null;
  change1d: number | null;
}

export async function fetchHLHoldings(address: string): Promise<HLSpotPosition[]> {
  const [spotMeta, { balances }, perpState, delegatorState, vaultDetails] = await Promise.all([
    hlPost<SpotMeta>({ type: "spotMeta" }),
    hlPost<{ balances: SpotBalance[] }>({ type: "spotClearinghouseState", user: address }),
    hlPost<ClearinghouseState>({ type: "clearinghouseState", user: address }).catch((e) => { console.error("[hl] clearinghouseState failed:", e); return null; }),
    hlPost<DelegatorState>({ type: "delegations", user: address }).catch((e) => { console.error("[hl] delegations failed:", e); return null; }),
    hlPost<VaultDetails>({ type: "vaultDetails", vaultAddress: HLP_VAULT, user: address }).catch((e) => { console.error("[hl] vaultDetails failed:", e); return null; }),
  ]);

  const tokenIdMap = new Map<string, string>(spotMeta.tokens.map((t) => [t.name, t.tokenId]));

  const heldCoins = Array.from(new Set([
    ...balances
      .filter((b) => parseFloat(b.total) > 0 && !STABLECOINS.has(b.coin) && b.coin !== "USDC")
      .map((b) => b.coin),
    "HYPE", // always fetch for staked HYPE pricing
  ]));

  const priceMap = new Map<string, { price: number; change1d: number | null }>();
  priceMap.set("USDC", { price: 1, change1d: 0 });
  for (const stable of STABLECOINS) priceMap.set(stable, { price: 1, change1d: 0 });

  await Promise.all(
    heldCoins
      .filter((coin) => tokenIdMap.has(coin))
      .map(async (coin) => {
        const tokenId = tokenIdMap.get(coin)!;
        const details = await hlPost<TokenDetails>({ type: "tokenDetails", tokenId }).catch(() => null);
        if (!details?.midPx) return;
        const price = parseFloat(details.midPx);
        const prevPrice = details.prevDayPx ? parseFloat(details.prevDayPx) : null;
        const change1d = prevPrice && prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : null;
        priceMap.set(coin, { price, change1d });
      })
  );

  const positions: HLSpotPosition[] = balances
    .filter((b) => parseFloat(b.total) > 0)
    .map((b) => {
      const qty = parseFloat(b.total);
      const info = priceMap.get(b.coin) ?? null;
      const price = info?.price ?? null;
      const value = price != null ? qty * price : null;
      return { symbol: b.coin, qty, price, value, change1d: info?.change1d ?? null };
    })
    .filter((p) => (p.value ?? 0) > 0.01);

  // Perp account value (collateral + unrealized PnL)
  if (perpState) {
    const perpValue = parseFloat(perpState.marginSummary.accountValue);
    if (perpValue > 0.01) {
      positions.push({ symbol: "USDC (Perp)", qty: perpValue, price: 1, value: perpValue, change1d: 0 });
    }
  }

  // Staked HYPE
  if (delegatorState?.length) {
    const totalStaked = delegatorState.reduce((s, d) => s + parseFloat(d.amount), 0);
    if (totalStaked > 0) {
      const hypeInfo = priceMap.get("HYPE") ?? null;
      const price = hypeInfo?.price ?? null;
      const value = price != null ? totalStaked * price : null;
      positions.push({ symbol: "HYPE (Staked)", qty: totalStaked, price, value, change1d: hypeInfo?.change1d ?? null });
    }
  }

  // HLP vault equity
  if (vaultDetails?.followerState?.vaultEquity) {
    const equity = parseFloat(vaultDetails.followerState.vaultEquity);
    if (equity > 0.01) {
      const name = vaultDetails.name ?? "HLP";
      positions.push({ symbol: name, qty: 1, price: null, value: equity, change1d: null });
    }
  }

  return positions;
}

async function hlPost<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${HL_BASE}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hyperliquid ${res.status} on ${body.type}: ${text}`);
  }
  return res.json();
}

interface Fill {
  coin: string;
  px: string;
  sz: string;
  closedPnl: string;
  fee: string;
  time: number;
}

async function fetchAllFills(address: string): Promise<Fill[]> {
  const all: Fill[] = [];
  let startTime = 0;
  let page = 0;

  while (true) {
    const batch = await hlPost<Fill[]>({ type: "userFillsByTime", user: address, startTime });
    page++;
    console.log(`[hl fills] page ${page}: ${batch.length} fills, startTime=${startTime}`);
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    startTime = batch[batch.length - 1].time + 1;
  }

  console.log(`[hl fills] total: ${all.length} fills across ${page} pages`);
  return all;
}

export interface HyperliquidStats {
  volume_usd: number;
  pnl_usd: number;
  fees_usd: number;
}

export async function fetchWalletStats(address: string, hlDex?: string | null): Promise<HyperliquidStats> {
  if (hlDex) {
    const fills = await fetchAllFills(address);
    const prefix = `${hlDex}:`;
    const relevant = fills.filter((f) => f.coin.startsWith(prefix));
    console.log(`[hl sync] ${fills.length} total fills, ${relevant.length} matching "${prefix}"`);
    if (relevant.length > 0) {
      console.log(`[hl sync] sample fill:`, JSON.stringify(relevant[0]));
    }
    const volume_usd = relevant.reduce((s, f) => s + parseFloat(f.sz) * parseFloat(f.px), 0);
    const pnl_usd = relevant.reduce((s, f) => s + parseFloat(f.closedPnl), 0);
    const fees_usd = relevant.reduce((s, f) => s + parseFloat(f.fee), 0);
    console.log(`[hl sync] volume_usd=${volume_usd}, pnl_usd=${pnl_usd}, fees_usd=${fees_usd}`);
    return { volume_usd, pnl_usd, fees_usd };
  }

  type PeriodData = { vlm: string; pnlHistory: [number, number][] };
  type Portfolio = [string, PeriodData][];

  const [portfolio, fills] = await Promise.all([
    hlPost<Portfolio>({ type: "portfolio", user: address }),
    fetchAllFills(address),
  ]);

  const perpAllTime = portfolio.find(([k]) => k === "perpAllTime")?.[1];
  if (!perpAllTime) throw new Error("No perpAllTime data returned");

  const volume_usd = parseFloat(perpAllTime.vlm) || 0;
  const pnl_usd =
    perpAllTime.pnlHistory.length > 0
      ? perpAllTime.pnlHistory[perpAllTime.pnlHistory.length - 1][1]
      : 0;
  const fees_usd = fills.reduce((s, f) => s + parseFloat(f.fee), 0);

  return { volume_usd, pnl_usd, fees_usd };
}
