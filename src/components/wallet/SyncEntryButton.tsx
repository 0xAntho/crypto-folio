"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function SyncEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function sync() {
    setLoading(true);
    await fetch(`/api/wallet-projects/${entryId}/sync`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" onClick={sync} disabled={loading}>
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
    </Button>
  );
}
