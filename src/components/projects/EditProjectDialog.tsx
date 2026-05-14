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
import { Pencil } from "lucide-react";
import type { Project } from "@/lib/repo/projects";

export default function EditProjectDialog({ project }: { project: Project }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(project.name);
  const [type, setType] = useState(project.type);
  const [url, setUrl] = useState(project.url ?? "");
  const [notes, setNotes] = useState(project.notes ?? "");
  const [syncAdapter, setSyncAdapter] = useState(project.sync_adapter ?? "");
  const [hlDex, setHlDex] = useState(project.hl_dex ?? "");

  async function save() {
    setSaving(true);
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, url: url || null, notes: notes || null, sync_adapter: syncAdapter || null, hl_dex: hlDex || null }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Project["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERP">PERP</SelectItem>
                  <SelectItem value="LP">LP / DEX</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Auto-sync</Label>
              <Select value={syncAdapter} onValueChange={setSyncAdapter}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                  <SelectItem value="extended">Extended</SelectItem>
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
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={remove}>Delete</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
