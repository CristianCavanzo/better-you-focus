"use client";

import { useCallback, useEffect, useState } from "react";
import { FocusState } from "@/src/types/focus";
import { makeInitialState } from "@/src/lib/focusLogic";

const KEY = "better-you-focus.state.v1";

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

  const hydrateFromServer = useCallback(async () => {
    const res = await fetch("/api/focus/state", { method: "GET" });
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.ok?.toString()) return;

    // merge simple: si local es "más nuevo", no pisar.
    const server = data.state as FocusState;
    const local = state;

    const localTs = Date.parse(local.lastLocalEditAt || "0");
    const serverTs = Date.parse(server.lastLocalEditAt || "0");

    if (Number.isFinite(serverTs) && serverTs > localTs) setState(server);
  }, [state]);

  return { state, setState, hydrateFromServer };
}
