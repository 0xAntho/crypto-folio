const HL_BASE = "https://api.hyperliquid.xyz";
const PAGE_SIZE = 2000;

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
