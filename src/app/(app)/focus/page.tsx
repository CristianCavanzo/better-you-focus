'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    addCategory,
    addTaskAndSelect,
    endBlock,
    ensureDraftBlock,
    getActiveBlock,
    getBlockById,
    getDraftBlockForCategory,
    getEditableBlockId,
    getNextPendingSelection,
    interruptBlock,
    setCategoryDefaultSeconds,
    setDraftPlannedSeconds,
    startBlock,
    toggleTaskDone,
    setTaskPriority,
    addTaskToBlock,
    removeTaskFromBlock,
    moveTaskToCategory,
} from '@/src/lib/focusLogic';
import { FocusEndSummary } from '@/src/components/focus/FocusEndSummary';
import { FireworksOverlay } from '@/src/components/focus/FireworksOverlay';
import { SyncButton } from '@/src/components/focus/SyncButton';
import { FocusTasksPanel } from '@/src/components/focus/FocusTasksPanel';
import { useFocusLocalState } from '@/src/hooks/useFocusLocalState';
import { Topbar } from '@/src/components/shell/Topbar';
import { RitualGate } from '@/src/components/focus/RitualGate';
import { PanicButton } from '@/src/components/focus/PanicButton';
import { cn } from '@/src/lib/ui';

const PRESETS_MIN = [15, 25, 45, 60, 90];

export default function FocusPage() {
    const { state, setState, hydrateFromServer } = useFocusLocalState();

    const [categoryId, setCategoryId] = useState<string>('work');
    const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
    const [running, setRunning] = useState(false);
    const [showSummaryForBlockId, setShowSummaryForBlockId] = useState<
        string | null
    >(null);
    const [showFireworks, setShowFireworks] = useState(false);
    const [entered, setEntered] = useState(false);
    const [addToBlock, setAddToBlock] = useState(true);

    const categories = useMemo(
        () =>
            state.categories.slice().sort((a, b) => a.sortOrder - b.sortOrder),
        [state.categories],
    );

    const activeBlock = useMemo(() => getActiveBlock(state), [state]);
    const draftBlock = useMemo(
        () => getDraftBlockForCategory(state, categoryId),
        [state, categoryId],
    );

    // Lock UI to the active block category
    useEffect(() => {
        if (!activeBlock) return;
        if (activeBlock.categoryId !== categoryId)
            setCategoryId(activeBlock.categoryId);
    }, [activeBlock, categoryId]);

    const editableBlockId = useMemo(
        () => getEditableBlockId(state, categoryId),
        [state, categoryId],
    );
    const editableBlock = useMemo(
        () => (editableBlockId ? getBlockById(state, editableBlockId) : null),
        [state, editableBlockId],
    );

    const plannedSeconds = useMemo(() => {
        if (activeBlock) return activeBlock.plannedSeconds;
        if (draftBlock) return draftBlock.plannedSeconds;
        const cat = categories.find((c) => c.id === categoryId);
        return cat?.defaultSeconds ?? 25 * 60;
    }, [activeBlock, draftBlock, categories, categoryId]);

    const nextPendingTaskId = useMemo(
        () =>
            activeBlock ? getNextPendingSelection(state, activeBlock.id) : null,
        [state, activeBlock],
    );

    useEffect(() => {
        hydrateFromServer().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Ensure there's always a draft for the selected category (unless an ACTIVE block exists)
    useEffect(() => {
        if (activeBlock) return;
        if (draftBlock) return;
        const next = ensureDraftBlock(state, categoryId);
        if (next !== state) setState(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, categoryId, activeBlock, draftBlock]);

    // Keep timer aligned when NOT running and no active block
    useEffect(() => {
        if (activeBlock) return;
        if (running) return;
        setSecondsLeft(plannedSeconds);
    }, [plannedSeconds, activeBlock, running]);

    // Tick
    useEffect(() => {
        if (!running) return;
        if (secondsLeft <= 0) return;
        const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearInterval(t);
    }, [running, secondsLeft]);

    // Natural end
    useEffect(() => {
        if (!running) return;
        if (secondsLeft > 0) return;

        setRunning(false);
        if (activeBlock) {
            const actual = activeBlock.plannedSeconds;
            const next = endBlock(state, activeBlock.id, actual);
            setState(next);
            setShowSummaryForBlockId(activeBlock.id);

            const ended = next.blocks.find((b) => b.id === activeBlock.id);
            if (ended?.allSelectedCompleted) {
                setShowFireworks(true);
                setTimeout(() => setShowFireworks(false), 4000);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [secondsLeft, running]);

    const mmss = (s: number) => {
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(Math.floor(s % 60)).padStart(2, '0');
        return `${mm}:${ss}`;
    };

    const onStart = () => {
        if (!entered) return;

        if (activeBlock) {
            setRunning(true);
            return;
        }

        // start from draft
        const prepared = ensureDraftBlock(state, categoryId);
        const next = startBlock(prepared, categoryId);
        setState(next);

        const newActive = getActiveBlock(next);
        setSecondsLeft(newActive?.plannedSeconds ?? plannedSeconds);
        setRunning(true);
    };

    const onPause = () => setRunning(false);

    const onResetTimer = () => {
        setRunning(false);
        setSecondsLeft(plannedSeconds);
    };

    const onInterrupt = () => {
        if (!activeBlock) return;

        setRunning(false);
        const elapsed = Math.max(
            0,
            Math.min(
                activeBlock.plannedSeconds,
                activeBlock.plannedSeconds - secondsLeft,
            ),
        );

        const reason =
            prompt(
                'Motivo de interrupción (rápido):\n- Fatiga\n- Distracción externa\n- Ansiedad/urge\n- Urgencia laboral\n- Otro',
            ) ?? '';

        const next = interruptBlock(state, activeBlock.id, elapsed, reason);
        setState(next);
        setShowSummaryForBlockId(activeBlock.id);
    };

    const onAddCategory = (name: string) => {
        const next = addCategory(state, name);
        setState(next);
        setCategoryId(
            next.categories[next.categories.length - 1]?.id ?? categoryId,
        );
    };

    const onChangeTime = (seconds: number) => {
        if (activeBlock) return;

        let next = state;
        next = setDraftPlannedSeconds(next, categoryId, seconds);
        next = setCategoryDefaultSeconds(next, categoryId, seconds);
        setState(next);
        setSecondsLeft(seconds);
    };

    const onToggleTask = (taskId: string) =>
        setState((prev) => toggleTaskDone(prev, taskId));

    const onCreateTask = (title: string) => {
        const blockId = addToBlock ? editableBlockId : null;
        setState((prev) =>
            addTaskAndSelect(prev, categoryId, title, blockId, { priority: 2 }),
        );
    };

    return (
        <div className="space-y-6">
            {showFireworks && <FireworksOverlay />}

            <Topbar title="Focus" />

            <div className="grid grid-cols-1 xl:grid-cols-[440px_1fr] gap-4">
                <div className="space-y-4">
                    {!entered ? (
                        <RitualGate onReady={() => setEntered(true)} />
                    ) : (
                        <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-sm font-semibold">
                                        Control
                                    </div>
                                    <div className="mt-1 text-xs text-muted">
                                        Prepara el bloque (tareas + tiempo) y
                                        ejecútalo. Ajusta tareas incluso durante
                                        Focus.
                                    </div>
                                </div>
                                <SyncButton state={state} />
                            </div>

                            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                                <select
                                    className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                                    value={categoryId}
                                    onChange={(e) =>
                                        setCategoryId(e.target.value)
                                    }
                                    disabled={!!activeBlock}
                                >
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
                                    onClick={() => {
                                        const name = prompt(
                                            'Nombre de grupo/categoría:',
                                        );
                                        if (name) onAddCategory(name);
                                    }}
                                    type="button"
                                >
                                    + Grupo
                                </button>
                            </div>

                            <div className="mt-3 rounded-3xl border border-white/10 bg-black/20 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <div className="text-xs text-muted">
                                            Tiempo del bloque
                                        </div>
                                        <div className="text-sm font-semibold">
                                            {Math.round(plannedSeconds / 60)}{' '}
                                            min
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        {PRESETS_MIN.map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                className={
                                                    'rounded-xl border px-3 py-1.5 text-xs ' +
                                                    (Math.round(
                                                        plannedSeconds / 60,
                                                    ) === m
                                                        ? 'border-white/20 bg-white/10'
                                                        : 'border-white/10 bg-white/5 hover:bg-white/10')
                                                }
                                                onClick={() =>
                                                    onChangeTime(m * 60)
                                                }
                                                disabled={!!activeBlock}
                                                title={
                                                    activeBlock
                                                        ? 'No cambies el tiempo con bloque activo'
                                                        : ''
                                                }
                                            >
                                                {m}m
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                                            onClick={() => {
                                                if (activeBlock) return;
                                                const v = prompt(
                                                    'Minutos personalizados (ej: 35):',
                                                );
                                                const n = Number(v);
                                                if (Number.isFinite(n) && n > 0)
                                                    onChangeTime(
                                                        Math.floor(n) * 60,
                                                    );
                                            }}
                                            disabled={!!activeBlock}
                                        >
                                            Custom
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-3xl border border-white/10 bg-black/10 p-5 text-center">
                                    <div className="text-6xl font-semibold tracking-tight">
                                        {mmss(secondsLeft)}
                                    </div>
                                    <div className="mt-2 text-sm text-muted">
                                        {activeBlock
                                            ? 'Bloque activo'
                                            : 'Bloque preparado'}{' '}
                                        · {editableBlock?.status ?? '—'}
                                    </div>

                                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                        {!running ? (
                                            <button
                                                className="rounded-2xl bg-accent/15 border border-white/10 px-4 py-2 text-sm hover:bg-accent/20"
                                                onClick={onStart}
                                                type="button"
                                            >
                                                {activeBlock
                                                    ? 'Resume'
                                                    : 'Start'}
                                            </button>
                                        ) : (
                                            <button
                                                className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                                                onClick={onPause}
                                                type="button"
                                            >
                                                Pause
                                            </button>
                                        )}

                                        <button
                                            className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                                            onClick={onResetTimer}
                                            type="button"
                                            disabled={running}
                                            title={
                                                running
                                                    ? 'Pausa antes de reset'
                                                    : ''
                                            }
                                        >
                                            Reset
                                        </button>

                                        {activeBlock && (
                                            <button
                                                className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                                                onClick={onInterrupt}
                                                type="button"
                                                title="Interrumpe y registra motivo"
                                            >
                                                Interrumpir
                                            </button>
                                        )}

                                        <button
                                            className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                                            onClick={() => setEntered(false)}
                                            disabled={running}
                                            type="button"
                                            title={
                                                running
                                                    ? 'Pausa antes de salir'
                                                    : 'Volver al ritual'
                                            }
                                        >
                                            Salir
                                        </button>
                                    </div>

                                    {activeBlock && (
                                        <div className="mt-4 text-xs text-muted">
                                            Próxima tarea:{' '}
                                            <span
                                                className={cn(
                                                    nextPendingTaskId
                                                        ? 'text-white/85'
                                                        : 'text-accent',
                                                )}
                                            >
                                                {nextPendingTaskId
                                                    ? 'pendiente'
                                                    : '✅ todas listas'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-5 flex items-center justify-between gap-2">
                                    <div className="text-sm font-semibold">
                                        Acción anti-recaída
                                    </div>
                                    <PanicButton
                                        categoryId={categoryId}
                                        blockId={activeBlock?.id ?? null}
                                    />
                                </div>

                                <div className="mt-5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-semibold">
                                            Crear task (rápido)
                                        </div>
                                        <label className="flex items-center gap-2 text-xs text-white/60">
                                            <input
                                                type="checkbox"
                                                checked={addToBlock}
                                                onChange={(e) =>
                                                    setAddToBlock(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="h-4 w-4"
                                                disabled={!editableBlockId}
                                            />
                                            añadir al bloque
                                        </label>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <input
                                            id="newTask"
                                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                                            placeholder="Ej: terminar endpoint X"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const v = (
                                                        e.target as HTMLInputElement
                                                    ).value;
                                                    if (v.trim())
                                                        onCreateTask(v);
                                                    (
                                                        e.target as HTMLInputElement
                                                    ).value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
                                            onClick={() => {
                                                const input =
                                                    document.getElementById(
                                                        'newTask',
                                                    ) as HTMLInputElement | null;
                                                const v = input?.value ?? '';
                                                if (v.trim()) onCreateTask(v);
                                                if (input) input.value = '';
                                            }}
                                            type="button"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-3xl border border-white/10 bg-surface2/50 p-5">
                    <FocusTasksPanel
                        state={state}
                        currentCategoryId={categoryId}
                        currentBlockId={editableBlockId}
                        currentBlockStatus={
                            (editableBlock?.status as any) ??
                            (activeBlock ? ('ACTIVE' as any) : ('DRAFT' as any))
                        }
                        nextPendingTaskId={nextPendingTaskId}
                        categories={categories}
                        onToggleTaskDone={onToggleTask}
                        onToggleTaskInBlock={(taskId, checked) => {
                            if (!editableBlockId) return;
                            setState((prev) =>
                                checked
                                    ? addTaskToBlock(
                                          prev,
                                          editableBlockId,
                                          taskId,
                                      )
                                    : removeTaskFromBlock(
                                          prev,
                                          editableBlockId,
                                          taskId,
                                      ),
                            );
                        }}
                        onSetPriority={(taskId, p) =>
                            setState((prev) => setTaskPriority(prev, taskId, p))
                        }
                        onMoveTask={(taskId, toCategoryId) =>
                            setState((prev) =>
                                moveTaskToCategory(prev, taskId, toCategoryId),
                            )
                        }
                    />
                </div>
            </div>

            {showSummaryForBlockId && (
                <FocusEndSummary
                    state={state}
                    blockId={showSummaryForBlockId}
                    onClose={() => {
                        setShowSummaryForBlockId(null);
                        setSecondsLeft(plannedSeconds);
                    }}
                />
            )}
        </div>
    );
}
