"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { fmtUsd, fmtNumber, fmtPercent } from "@/lib/format";
import { Pencil, Minus, Plus } from "lucide-react";

interface Position {
  name: string;
  symbol: string;
  qty: number;
  value: number | null;
  price: number | null;
  change1d: number | null;
  change1d_usd: number | null;
  chain: string;
  isManual?: boolean;
  holdingId?: string;
  positionKey?: string;
}

const PAGE_SIZE = 5;

export default function HoldingsList({
  walletId,
  positions,
  chainBreakdown,
}: {
  walletId: string;
  positions: Position[];
  chainBreakdown?: [string, number][];
}) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [chain, setChain] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Position | null>(null);

  const [editingCell, setEditingCell] = useState<{ rowKey: string; field: "qty" | "price" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingCell, setSavingCell] = useState(false);
  const savingRef = useRef(false);

  const chains = chainBreakdown ?? Array.from(
    positions.reduce((map, p) => {
      map.set(p.chain, (map.get(p.chain) ?? 0) + (p.value ?? 0));
      return map;
    }, new Map<string, number>())
  ).filter(([, v]) => v >= 50).sort((a, b) => b[1] - a[1]);

  const filtered = (selectedChain ? positions.filter((p) => p.chain === selectedChain) : positions)
    .slice()
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const above1k = filtered.filter((p) => (p.value ?? 0) >= 1000);
  const visible = showAll ? filtered : above1k.slice(0, PAGE_SIZE);
  const hasMore = !showAll && (above1k.length > PAGE_SIZE || filtered.length > above1k.length);

  function rowKey(p: Position) {
    return p.holdingId ?? p.positionKey ?? `${p.symbol}:${p.chain}`;
  }

  function selectChain(c: string) {
    setSelectedChain((prev) => prev === c ? null : c);
    setShowAll(false);
  }

  function startEdit(p: Position, field: "qty" | "price") {
    setEditingCell({ rowKey: rowKey(p), field });
    setEditValue(String(field === "qty" ? p.qty : (p.price ?? "")));
  }

  async function saveEdit(p: Position) {
    if (!editingCell || savingRef.current) return;
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) {
      setEditingCell(null);
      return;
    }
    savingRef.current = true;
    setSavingCell(true);

    if (p.isManual && p.holdingId) {
      await fetch(`/api/wallets/${walletId}/holdings/${p.holdingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [editingCell.field]: val }),
      });
    } else if (p.positionKey) {
      await fetch(`/api/wallets/${walletId}/position-overrides`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: p.positionKey, [editingCell.field]: val }),
      });
    }

    savingRef.current = false;
    setSavingCell(false);
    setEditingCell(null);
    router.refresh();
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setConfirmDelete(null);
    if (confirmDelete.isManual && confirmDelete.holdingId) {
      await fetch(`/api/wallets/${walletId}/holdings/${confirmDelete.holdingId}`, { method: "DELETE" });
    } else if (confirmDelete.positionKey) {
      await fetch(`/api/wallets/${walletId}/hidden-positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: confirmDelete.positionKey }),
      });
    }
    setDeleting(false);
    router.refresh();
  }

  async function handleAdd() {
    if (!symbol || !chain || !qty) return;
    setSaving(true);
    await fetch(`/api/wallets/${walletId}/holdings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, chain, qty: Number(qty) }),
    });
    setSaving(false);
    setAddOpen(false);
    setSymbol("");
    setChain("");
    setQty("");
    router.refresh();
  }

  function EditableCell({
    p,
    field,
    display,
  }: {
    p: Position;
    field: "qty" | "price";
    display: string;
  }) {
    const key = rowKey(p);
    const isEditing = editingCell?.rowKey === key && editingCell?.field === field;

    if (!editMode) return <>{display}</>;

    if (isEditing) {
      return (
        <Input
          type="number"
          className="h-7 w-28 text-right ml-auto"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(p)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); saveEdit(p); }
            if (e.key === "Escape") cancelEdit();
          }}
          disabled={savingCell}
          autoFocus
        />
      );
    }

    return (
      <span
        className="cursor-pointer rounded px-1 hover:bg-muted transition-colors"
        onClick={() => startEdit(p, field)}
        title={`Click to edit ${field}`}
      >
        {display}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Holdings</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setEditMode((v) => !v); setEditingCell(null); }}
          className={editMode ? "text-primary" : ""}
        >
          <Pencil className="h-4 w-4 mr-1" />
          {editMode ? "Done" : "Edit"}
        </Button>
      </div>

      {positions.length > 0 && (
        <>
          {chains.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chains.map(([c, value]) => (
                <button
                  key={c}
                  onClick={() => selectChain(c)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors
                    ${selectedChain === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground hover:bg-muted"
                    }`}
                >
                  <span className="capitalize">{c}</span>
                  <span className={selectedChain === c ? "text-primary-foreground/80" : "font-medium text-foreground"}>
                    {fmtUsd(value, 0)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/40 [&_th]:font-semibold">
                <TableRow>
                  {editMode && <TableHead className="w-8" />}
                  <TableHead>Asset</TableHead>
                  <TableHead>Chain</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">24h change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((p, i) => (
                  <TableRow key={i}>
                    {editMode && (
                      <TableCell className="pr-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          disabled={deleting}
                          onClick={() => setConfirmDelete(p)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="font-medium">{p.symbol}</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.name}</span>
                      {p.isManual && (
                        <span className="text-xs text-muted-foreground ml-1 opacity-50">(manual)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.chain}</TableCell>
                    <TableCell className="text-right">
                      <EditableCell p={p} field="price" display={fmtUsd(p.price, 4)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <EditableCell p={p} field="qty" display={fmtNumber(p.qty, 4)} />
                    </TableCell>
                    <TableCell className="text-right">{fmtUsd(p.value)}</TableCell>
                    <TableCell className={`text-right text-sm ${(p.change1d ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                      <div>{fmtPercent(p.change1d)}</div>
                      <div className="text-xs opacity-75">{fmtUsd(p.change1d_usd)}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {(hasMore || showAll) && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show less" : `Show all ${filtered.length} assets`}
            </Button>
          )}
        </>
      )}

      {editMode && (
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add holding
        </Button>
      )}

      <Dialog open={!!confirmDelete} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {confirmDelete?.symbol}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmDelete?.isManual
              ? "This will permanently delete this manual holding."
              : "This will hide this position. It won't reappear after future syncs."}
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add holding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Token symbol</Label>
              <Input
                placeholder="e.g. ETH"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Chain</Label>
              <Input
                placeholder="e.g. ethereum, arbitrum, base"
                value={chain}
                onChange={(e) => setChain(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                placeholder="e.g. 1.5"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Price will be fetched automatically from Zerion.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !symbol || !chain || !qty}>
              {saving ? "Fetching price…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
