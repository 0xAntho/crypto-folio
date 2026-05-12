"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export default function AddProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("PERP");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [syncAdapter, setSyncAdapter] = useState("");
  const [hlDex, setHlDex] = useState("");

  async function save() {
    if (!name) return;
    setSaving(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, url: url || null, notes: notes || null, sync_adapter: syncAdapter || null, hl_dex: hlDex || null }),
    });
    setSaving(false);
    setOpen(false);
    setName(""); setType("PERP"); setUrl(""); setNotes(""); setSyncAdapter(""); setHlDex("");
    router.refresh();
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> New project
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hyperliquid" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERP">PERP</SelectItem>
                  <SelectItem value="LP">LP / DEX</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>URL (optional)</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="space-y-1">
              <Label>Auto-sync (optional)</Label>
              <Select value={syncAdapter} onValueChange={setSyncAdapter}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {syncAdapter === "hyperliquid" && (
              <div className="space-y-1">
                <Label>HL DEX prefix (optional)</Label>
                <Input value={hlDex} onChange={(e) => setHlDex(e.target.value)} placeholder="e.g. xyz, km" />
                <p className="text-xs text-muted-foreground">Only fills for {hlDex || "dex"}:* coins will be counted</p>
              </div>
            )}
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !name}>
              {saving ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
