"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Props {
  wallets: { id: string; label: string }[];
}

export default function SyncAllButton({ wallets }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function syncAll() {
    setLoading(true);
    await Promise.allSettled(
      wallets.map((w) =>
        fetch(`/api/wallets/${w.id}/sync`, { method: "POST" })
      )
    );
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={syncAll} disabled={loading}>
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      Sync all
    </Button>
  );
}
