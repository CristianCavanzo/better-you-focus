"use client";

import { useState } from "react";
import { FocusState, SyncResponse } from "@/src/types/focus";

export function SyncButton({ state }: { state: FocusState }) {
  const [status, setStatus] = useState<"idle" | "syncing" | "ok" | "err">("idle");

  const sync = async () => {
    setStatus("syncing");
    try {
      const res = await fetch("/api/focus/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = (await res.json()) as SyncResponse;
      if (!data.ok) throw new Error("sync failed");
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("err");
      setTimeout(() => setStatus("idle"), 1500);
    }
  };

  const label =
    status === "syncing" ? "Syncing..." : status === "ok" ? "Synced ✅" : status === "err" ? "Error" : "Sync DB";

  return (
    <button
      className="shrink-0 rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm hover:bg-white/15"
      onClick={sync}
      type="button"
    >
      {label}
    </button>
  );
}
