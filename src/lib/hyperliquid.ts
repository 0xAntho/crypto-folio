const HL_BASE = "https://api.hyperliquid.xyz";

async function hlPost<T>(type: string, user: string): Promise<T> {
  const res = await fetch(`${HL_BASE}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, user }),
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Hyperliquid ${res.status} on ${type}: ${body}`);
  }
  return res.json();
}

export interface HyperliquidStats {
  volume_usd: number;
  pnl_usd: number;
}

export async function fetchWalletStats(address: string): Promise<HyperliquidStats> {
  type PeriodData = { vlm: string; pnlHistory: [number, number][] };
  type Portfolio = [string, PeriodData][];

  const portfolio = await hlPost<Portfolio>("portfolio", address);
  const perpAllTime = portfolio.find(([k]) => k === "perpAllTime")?.[1];
  if (!perpAllTime) throw new Error("No perpAllTime data returned");

  const volume_usd = parseFloat(perpAllTime.vlm) || 0;
  const pnl_usd =
    perpAllTime.pnlHistory.length > 0
      ? perpAllTime.pnlHistory[perpAllTime.pnlHistory.length - 1][1]
      : 0;

  return { volume_usd, pnl_usd };
}
