'use client';

import { useCallback, useEffect, useState } from 'react';
import { FocusState } from '@/src/types/focus';
import { makeInitialState } from '@/src/lib/focusLogic';

const KEY = 'better-you-focus.state.v1';

function normalizeState(raw: any): FocusState {
    const base = makeInitialState();
    const s = raw as FocusState;

    const categories = (s.categories ?? base.categories).map(
        (c: any, idx: number) => ({
            id: String(c.id ?? base.categories[idx]?.id ?? 'c' + idx),
            name: String(c.name ?? 'Grupo'),
            sortOrder: Number.isFinite(c.sortOrder) ? Number(c.sortOrder) : idx,
            defaultSeconds: Number.isFinite(c.defaultSeconds)
                ? Number(c.defaultSeconds)
                : 25 * 60,
        }),
    );

    const tasks = (s.tasks ?? base.tasks).map((t: any, idx: number) => ({
        id: String(t.id ?? 't' + idx),
        categoryId: String(t.categoryId ?? categories[0]?.id),
        title: String(t.title ?? 'Task'),
        status: (t.status ?? 'PENDING') as any,
        sortOrder: Number.isFinite(t.sortOrder) ? Number(t.sortOrder) : idx,
        priority: (Number.isFinite(t.priority) ? Number(t.priority) : 2) as any,
        notes: t.notes ?? null,
        selectedAt: t.selectedAt ?? null,
        completedAt: t.completedAt ?? null,
    }));

    const blocks = (s.blocks ?? []).map((b: any) => ({
        id: String(b.id),
        categoryId: String(b.categoryId),
        status: (b.status ?? 'COMPLETED') as any,
        plannedSeconds: Number(b.plannedSeconds ?? 25 * 60),
        actualSeconds: b.actualSeconds ?? null,
        startedAt: b.startedAt ?? null,
        endedAt: b.endedAt ?? null,
        endReason: b.endReason ?? null,
        allSelectedCompleted: Boolean(b.allSelectedCompleted),
    }));

    const selections = (s.selections ?? []).map((x: any, idx: number) => ({
        id: String(x.id ?? 's' + idx),
        blockId: String(x.blockId),
        taskId: String(x.taskId),
        sortOrder: Number.isFinite(x.sortOrder) ? Number(x.sortOrder) : idx,
        doneAt: x.doneAt ?? null,
    }));

    return {
        version: 1,
        lastLocalEditAt: String(s.lastLocalEditAt ?? base.lastLocalEditAt),
        categories,
        tasks,
        blocks,
        selections,
    };
}

export function useFocusLocalState() {
    const [state, setState] = useState<FocusState>(() => makeInitialState());

    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.version === 1) setState(normalizeState(parsed));
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
        const res = await fetch('/api/focus/state', { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.ok?.toString()) return;

        const server = normalizeState(data.state);
        const local = state;

        const localTs = Date.parse(local.lastLocalEditAt || '0');
        const serverTs = Date.parse(server.lastLocalEditAt || '0');

        // If server snapshot is newer than local, hydrate.
        if (Number.isFinite(serverTs) && serverTs > localTs) setState(server);
    }, [state]);

    return { state, setState, hydrateFromServer };
}
