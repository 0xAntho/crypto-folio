"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const [zerionKey, setZerionKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function saveKey() {
    await fetch("/api/settings/zerion-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: zerionKey }),
    });
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  async function changePassword() {
    if (!oldPassword || !newPassword) return;
    setPwLoading(true);
    const res = await fetch("/api/settings/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    setPwLoading(false);
    if (res.ok) {
      setPwMsg("Password updated.");
      setOldPassword(""); setNewPassword("");
    } else {
      const data = await res.json();
      setPwMsg(data.error ?? "Error");
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Zerion API key</h2>
        <p className="text-sm text-muted-foreground">
          The key is stored in your <code>.env.local</code> file. Set it there directly, or use this form to update it at runtime (requires restart to persist).
        </p>
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="zk_…"
            value={zerionKey}
            onChange={(e) => setZerionKey(e.target.value)}
          />
          <Button variant="outline" onClick={saveKey} disabled={!zerionKey}>
            {keySaved ? "Saved!" : "Save"}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Change password</h2>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label>Current password</Label>
            <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>New password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          {pwMsg && <p className="text-sm text-muted-foreground">{pwMsg}</p>}
          <Button onClick={changePassword} disabled={pwLoading}>
            {pwLoading ? "Updating…" : "Update password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
