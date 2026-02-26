"use client";

import { useCallback, useEffect, useState } from "react";
import { FocusState } from "@/src/types/focus";
import { makeInitialState } from "@/src/lib/focusLogic";

const KEY = "better-you-focus.state.v1";

function byId<T extends { id: string }>(arr: T[]) {
  return new Map(arr.map((x) => [x.id, x] as const));
}

function mergeMissing(local: FocusState, server: FocusState): FocusState {
  const cats = byId(local.categories);
  const tasks = byId(local.tasks);
  const blocks = byId(local.blocks);
  const sels = byId(local.selections);

  const merged: FocusState = {
    ...local,
    categories: [...local.categories],
    tasks: [...local.tasks],
    blocks: [...local.blocks],
    selections: [...local.selections]
  };

  for (const c of server.categories) {
    if (!cats.has(c.id)) merged.categories.push(c);
  }
  for (const t of server.tasks) {
    if (!tasks.has(t.id)) merged.tasks.push(t);
  }
  for (const b of server.blocks) {
    if (!blocks.has(b.id)) merged.blocks.push(b);
  }
  for (const s of server.selections) {
    if (!sels.has(s.id)) merged.selections.push(s);
  }

  // no tocamos lastLocalEditAt local
  return merged;
}

export function useFocusLocalState() {
  const [state, setState] = useState<FocusState>(() => makeInitialState());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as FocusState;
      if (parsed?.version === 1) setState(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  // Auto-sync (baja fricción): guarda cambios al server con debounce.
  // Nota: el timer no vive en FocusState, así que no dispara cada segundo.
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/focus/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state })
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastLocalEditAt]);

  const hydrateFromServer = useCallback(async () => {
    const res = await fetch("/api/focus/state", { method: "GET" });
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.ok?.toString()) return;

    const server = data.state as FocusState;
    const local = state;

    const localTs = Date.parse(local.lastLocalEditAt || "0");
    const serverTs = Date.parse(server.lastLocalEditAt || "0");

    // Si server está más nuevo, pisa.
    if (Number.isFinite(serverTs) && serverTs > localTs) {
      setState(server);
      return;
    }

    // Si local está más nuevo, no pises, pero trae entidades nuevas del server (ej: check-in creó task).
    const merged = mergeMissing(local, server);
    if (
      merged.categories.length !== local.categories.length ||
      merged.tasks.length !== local.tasks.length ||
      merged.blocks.length !== local.blocks.length ||
      merged.selections.length !== local.selections.length
    ) {
      setState(merged);
    }
  }, [state]);

  return { state, setState, hydrateFromServer };
}
