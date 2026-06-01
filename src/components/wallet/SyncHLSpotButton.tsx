"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function SyncHLSpotButton({ walletId }: { walletId: string }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setError(null);
    const res = await fetch(`/api/wallets/${walletId}/sync-hl-spot`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Sync failed");
    }
    setSyncing(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={sync} disabled={syncing} title={error ?? undefined}>
        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
        Sync HL Spot
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
