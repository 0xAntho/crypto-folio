"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RefreshCw, Copy, Check, Pencil } from "lucide-react";

interface Props {
  walletId: string;
  address: string;
  label: string;
}

export default function WalletActions({ walletId, address, label }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newLabel, setNewLabel] = useState(label);
  const [saving, setSaving] = useState(false);

  async function sync() {
    setSyncing(true);
    await Promise.all([
      fetch(`/api/wallets/${walletId}/sync`, { method: "POST" }),
      fetch(`/api/wallets/${walletId}/sync-hl-spot`, { method: "POST" }),
    ]);
    setSyncing(false);
    router.refresh();
  }

  async function copy() {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function saveLabel() {
    if (!newLabel.trim()) return;
    setSaving(true);
    await fetch(`/api/wallets/${walletId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim() }),
    });
    setSaving(false);
    setEditOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => { setNewLabel(label); setEditOpen(true); }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          Sync
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename wallet</DialogTitle>
          </DialogHeader>
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveLabel()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveLabel} disabled={saving || !newLabel.trim()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
