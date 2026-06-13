"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore } from "lucide-react";

export default function ArchiveEntryButton({ entryId, status }: { entryId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isClosed = status === "closed";

  async function toggle() {
    setLoading(true);
    await fetch(`/api/wallet-projects/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: isClosed ? "active" : "closed" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} disabled={loading} title={isClosed ? "Reactivate" : "Close (hide from dashboard)"}>
      {isClosed ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
    </Button>
  );
}
