"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Plus, LayoutDashboard, Settings, LogOut, Wallet, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtUsd, truncateAddress } from "@/lib/format";
import type { WalletWithCache } from "@/lib/repo/wallets";
import { cn } from "@/lib/utils";

interface Props {
  wallets: WalletWithCache[];
}

export default function WalletSidebar({ wallets: initial }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [wallets, setWallets] = useState(initial);
  useEffect(() => { setWallets(initial); }, [initial]);
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  async function addWallet() {
    if (!address || !label) return;
    if (wallets.some((w) => w.address === address.toLowerCase())) {
      setError("This wallet is already added.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/wallets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, label }),
    });
    if (res.ok) {
      const w = await res.json();
      setWallets((prev) => [...prev, w]);
      setOpen(false);
      setAddress("");
      setLabel("");
      router.push(`/wallets/${w.address}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to add wallet.");
    }
    setSaving(false);
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const from = wallets.findIndex((w) => w.id === draggedId);
    const to = wallets.findIndex((w) => w.id === targetId);
    const next = [...wallets];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setWallets(next);
    setDraggedId(null);
    setDragOverId(null);
    fetch("/api/wallets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((w) => w.id) }),
    });
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  return (
    <aside className="flex flex-col w-64 shrink-0 border-r bg-card h-screen sticky top-0">
      <div className="p-4 border-b">
        <span className="font-semibold text-lg">Crypto Folio</span>
      </div>

      <nav className="flex flex-col gap-1 p-2">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors",
            pathname === "/" && "bg-accent font-medium"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
      </nav>

      <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Wallets
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-1 px-2">
        {wallets.map((w) => (
          <div
            key={w.id}
            draggable
            onDragStart={() => handleDragStart(w.id)}
            onDragOver={(e) => handleDragOver(e, w.id)}
            onDrop={() => handleDrop(w.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "flex items-center gap-1 rounded-md transition-colors",
              dragOverId === w.id && draggedId !== w.id && "ring-1 ring-ring",
              draggedId === w.id && "opacity-40"
            )}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground cursor-grab ml-1" />
            <Link
              href={`/wallets/${w.address}`}
              draggable={false}
              className={cn(
                "flex flex-col flex-1 rounded-md px-2 py-2 text-sm hover:bg-accent transition-colors",
                pathname === `/wallets/${w.address}` && "bg-accent"
              )}
            >
              <span className="font-medium truncate">{w.label}</span>
              <span className="text-xs text-muted-foreground flex justify-between">
                <span>{truncateAddress(w.address)}</span>
                <span>{w.displayed_total != null ? fmtUsd(w.displayed_total, 0) : (w.total_usd != null || w.hl_total_usd != null) ? fmtUsd((w.total_usd ?? 0) + (w.hl_total_usd ?? 0), 0) : "—"}</span>
              </span>
            </Link>
          </div>
        ))}

        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 mt-1"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add wallet
        </Button>
      </div>

      <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Farming
      </div>
      <nav className="flex flex-col gap-1 p-2">
        <Link
          href="/projects"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors",
            pathname.startsWith("/projects") && "bg-accent font-medium"
          )}
        >
          <Wallet className="h-4 w-4" />
          Projects
        </Link>
      </nav>

      <div className="p-2 border-t flex flex-col gap-1">
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); setAddress(""); setLabel(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>EVM Address</Label>
              <Input
                placeholder="0x…"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setError(null); }}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input
                placeholder="Main, Farm 2, …"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addWallet} disabled={saving}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
