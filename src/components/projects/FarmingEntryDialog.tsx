"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Project } from "@/lib/repo/projects";
import type { WalletProjectWithNames } from "@/lib/repo/walletProjects";

interface Props {
  walletId: string;
  projects: Project[];
  existingIds: string[];
  editEntry?: WalletProjectWithNames;
}

interface CustomField { key: string; value: string }

export default function FarmingEntryDialog({ walletId, projects, existingIds, editEntry }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const availableProjects = editEntry
    ? projects
    : projects.filter((p) => !existingIds.includes(p.id));

  const defaultProject = editEntry
    ? projects.find((p) => p.id === editEntry.project_id)
    : availableProjects[0];

  const [projectId, setProjectId] = useState(defaultProject?.id ?? "");
  const [volumeUsd, setVolumeUsd] = useState(String(editEntry?.volume_usd ?? ""));
  const [feesUsd, setFeesUsd] = useState(String(editEntry?.fees_usd ?? ""));
  const [gasUsd, setGasUsd] = useState(String(editEntry?.gas_usd ?? ""));
  const [points, setPoints] = useState(String(editEntry?.points ?? ""));
  const [initialLiqUsd, setInitialLiqUsd] = useState(String(editEntry?.initial_liq_usd ?? ""));
  const [currentApr, setCurrentApr] = useState(String(editEntry?.current_apr ?? ""));
  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    if (!editEntry) return [];
    try {
      const obj = JSON.parse(editEntry.custom_fields);
      return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
    } catch { return []; }
  });

  const selectedProject = projects.find((p) => p.id === projectId);
  const type = selectedProject?.type ?? "OTHER";

  function addCustomField() {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeCustomField(i: number) {
    setCustomFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateCustomField(i: number, field: "key" | "value", val: string) {
    setCustomFields((prev) =>
      prev.map((cf, idx) => (idx === i ? { ...cf, [field]: val } : cf))
    );
  }

  async function save() {
    setSaving(true);
    const cfObj = Object.fromEntries(customFields.map((cf) => [cf.key, cf.value]));
    const body = {
      id: editEntry?.id,
      wallet_id: walletId,
      project_id: projectId,
      volume_usd: volumeUsd ? parseFloat(volumeUsd) : null,
      fees_usd: feesUsd ? parseFloat(feesUsd) : null,
      gas_usd: gasUsd ? parseFloat(gasUsd) : null,
      points: points ? parseFloat(points) : null,
      initial_liq_usd: initialLiqUsd ? parseFloat(initialLiqUsd) : null,
      current_apr: currentApr ? parseFloat(currentApr) : null,
      custom_fields: cfObj,
    };
    await fetch("/api/wallet-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!editEntry) return;
    await fetch(`/api/wallet-projects/${editEntry.id}`, { method: "DELETE" });
    setOpen(false);
    router.refresh();
  }

  if (availableProjects.length === 0 && !editEntry) return null;

  return (
    <>
      <Button
        variant={editEntry ? "ghost" : "outline"}
        size={editEntry ? "icon" : "sm"}
        onClick={() => setOpen(true)}
      >
        {editEntry ? <Pencil className="h-4 w-4" /> : <><Plus className="h-4 w-4 mr-1" /> Add project</>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editEntry ? "Edit entry" : "Add farming entry"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!editEntry && (
              <div className="space-y-1">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={(v) => v && setProjectId(v)}>
                  <SelectTrigger><SelectValue placeholder="Select project">{availableProjects.find(p => p.id === projectId)?.name}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {availableProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(type === "PERP" || type === "OTHER") && (
              <div className="grid grid-cols-2 gap-3">
                {type === "PERP" && (
                  <NumField label="Volume ($)" value={volumeUsd} onChange={setVolumeUsd} />
                )}
                {type === "PERP" && (
                  <NumField label="Fees ($)" value={feesUsd} onChange={setFeesUsd} />
                )}
              </div>
            )}

            {type === "LP" && (
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Initial liquidity ($)" value={initialLiqUsd} onChange={setInitialLiqUsd} />
                <NumField label="APR (%)" value={currentApr} onChange={setCurrentApr} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <NumField label="Gas ($)" value={gasUsd} onChange={setGasUsd} />
              <NumField label="Points" value={points} onChange={setPoints} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom fields</Label>
                <Button variant="ghost" size="sm" onClick={addCustomField}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {customFields.map((cf, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    placeholder="key"
                    value={cf.key}
                    onChange={(e) => updateCustomField(i, "key", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="value"
                    value={cf.value}
                    onChange={(e) => updateCustomField(i, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeCustomField(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <div>
              {editEntry && (
                <Button variant="destructive" size="sm" onClick={remove}>Delete</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !projectId}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
