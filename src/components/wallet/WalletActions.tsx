"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, Check } from "lucide-react";

interface Props {
  walletId: string;
  address: string;
}

export default function WalletActions({ walletId, address }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function sync() {
    setSyncing(true);
    await fetch(`/api/wallets/${walletId}/sync`, { method: "POST" });
    setSyncing(false);
    router.refresh();
  }

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="icon" onClick={copy}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
        Sync
      </Button>
    </div>
  );
}
