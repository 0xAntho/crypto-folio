"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Props {
  entryIds: string[];
}

export default function SyncAllFarmingButton({ entryIds }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function syncAll() {
    setLoading(true);
    for (const id of entryIds) {
      await fetch(`/api/wallet-projects/${id}/sync`, { method: "POST" });
    }
    setLoading(false);
    router.refresh();
  }

  if (entryIds.length === 0) return null;

  return (
    <Button variant="outline" size="sm" onClick={syncAll} disabled={loading}>
      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      Sync all
    </Button>
  );
}
