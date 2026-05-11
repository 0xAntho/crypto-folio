"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Plus, LayoutDashboard, Settings, LogOut, Wallet } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function addWallet() {
    if (!address || !label) return;
    setSaving(true);
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
      router.push(`/wallets/${w.id}`);
    }
    setSaving(false);
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
          <Link
            key={w.id}
            href={`/wallets/${w.id}`}
            className={cn(
              "flex flex-col rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors",
              pathname === `/wallets/${w.id}` && "bg-accent"
            )}
          >
            <span className="font-medium truncate">{w.label}</span>
            <span className="text-xs text-muted-foreground flex justify-between">
              <span>{truncateAddress(w.address)}</span>
              <span>{w.total_usd != null ? fmtUsd(w.total_usd, 0) : "—"}</span>
            </span>
          </Link>
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

      <Dialog open={open} onOpenChange={setOpen}>
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
                onChange={(e) => setAddress(e.target.value)}
              />
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
