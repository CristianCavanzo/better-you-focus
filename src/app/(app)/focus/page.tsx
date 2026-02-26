'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    addCategory,
    addTask,
    endBlock,
    ensureDraftBlock,
    getActiveBlock,
    getDraftBlock,
    getNextPendingSelection,
    startBlock,
    toggleTaskDone,
    toggleTaskInBlock,
    updateCategoryDefaultSeconds,
    updateTaskCategory,
    updateTaskPriority,
    updateTaskDueAt,
    updateTaskRepeat,
    updateTaskEstimate,
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

const TIME_PRESETS_MIN = [15, 25, 45, 60, 90];

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
    const [ritualOpen, setRitualOpen] = useState(false);
    const [addNewTaskToBlock, setAddNewTaskToBlock] = useState(true);
    const [checkinRec, setCheckinRec] = useState<{
        blockMin: number;
        wip: number;
    } | null>(null);

    const categories = state.categories
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder);

    const activeBlock = useMemo(() => getActiveBlock(state), [state]);
    const draftBlock = useMemo(
        () => getDraftBlock(state, categoryId),
        [state, categoryId],
    );

    const currentBlock = activeBlock ?? draftBlock;
    const currentBlockStatus = currentBlock
        ? currentBlock.status === 'ACTIVE'
            ? 'ACTIVE'
            : currentBlock.status === 'DRAFT'
              ? 'DRAFT'
              : null
        : null;

    const nextPendingTaskId = useMemo(
        () =>
            activeBlock ? getNextPendingSelection(state, activeBlock.id) : null,
        [state, activeBlock],
    );

    // hydrate 1 vez
    useEffect(() => {
        hydrateFromServer().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Trae recomendación del check-in (si existe)
    useEffect(() => {
        fetch('/api/check-in/today')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d?.ok && d?.rec) setCheckinRec(d.rec);
            })
            .catch(() => {});
    }, []);

    // ritual: 1 vez por día (local)
    useEffect(() => {
        try {
            const key = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'America/Bogota',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(new Date());
            const v = localStorage.getItem(`better-you-focus.ritual.${key}`);
            if (v) setEntered(true);
        } catch {
            // ignore
        }
    }, []);

    // Garantiza draft para la categoría si no hay bloque activo (puedes planear antes del ritual)
    useEffect(() => {
        if (activeBlock) return;

        const cat = categories.find((c) => c.id === categoryId);
        const planned = cat?.defaultSeconds ?? 25 * 60;

        const next = ensureDraftBlock(
            state,
            categoryId,
            draftBlock?.plannedSeconds ?? planned,
        );
        if (next !== state) setState(next);

        // inicializa secondsLeft si no está corriendo
        if (!running) {
            const useSec = (draftBlock?.plannedSeconds ?? planned) || 25 * 60;
            setSecondsLeft(useSec);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryId, activeBlock, state.categories.length, state.blocks.length]);

    // timer tick
    useEffect(() => {
        if (!running) return;
        if (secondsLeft <= 0) return;
        const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearInterval(t);
    }, [running, secondsLeft]);

    // cuando termina
    useEffect(() => {
        if (!running) return;
        if (secondsLeft > 0) return;

        setRunning(false);

        if (activeBlock) {
            const actual = activeBlock.plannedSeconds;
            const next = endBlock(state, activeBlock.id, actual, {
                status: 'COMPLETED',
            });
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

    // default del checkbox de "añadir al bloque" según contexto
    useEffect(() => {
        setAddNewTaskToBlock(
            !!currentBlock &&
                (currentBlock.status === 'DRAFT' ||
                    currentBlock.status === 'ACTIVE'),
        );
    }, [currentBlock?.id]);

    const mmss = (s: number) => {
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(Math.floor(s % 60)).padStart(2, '0');
        return `${mm}:${ss}`;
    };

    const plannedSeconds = useMemo(() => {
        const cat = categories.find((c) => c.id === categoryId);
        return currentBlock?.plannedSeconds ?? cat?.defaultSeconds ?? 25 * 60;
    }, [categories, categoryId, currentBlock?.plannedSeconds]);

    const applyPlannedSeconds = (sec: number) => {
        if (activeBlock) return;

        // actualiza default del grupo + planned del draft
        let next = updateCategoryDefaultSeconds(state, categoryId, sec);
        next = ensureDraftBlock(next, categoryId, sec);
        setState(next);
        setSecondsLeft(sec);
    };

    const onStart = () => {
        if (!entered) {
            setRitualOpen(true);
            return;
        }

        if (activeBlock) {
            setRunning(true);
            return;
        }

        const next = startBlock(state, categoryId, plannedSeconds, 6);
        setState(next);
        setSecondsLeft(plannedSeconds);
        setRunning(true);
    };

    const onStop = () => setRunning(false);

    const onReset = () => {
        setRunning(false);
        setSecondsLeft(plannedSeconds);
    };

    const onInterrupt = () => {
        if (!activeBlock) return;

        setRunning(false);
        const reason = prompt(
            '¿Por qué interrumpiste el bloque? (ej: fatiga / urgencia / distracción externa)',
        );
        if (!reason?.trim()) return;

        const elapsed = Math.max(
            0,
            Math.min(
                activeBlock.plannedSeconds,
                activeBlock.plannedSeconds - secondsLeft,
            ),
        );
        const next = endBlock(state, activeBlock.id, elapsed, {
            status: 'INTERRUPTED',
            reason: reason.trim().slice(0, 160),
        });
        setState(next);
        setShowSummaryForBlockId(activeBlock.id);
        setSecondsLeft(plannedSeconds);
    };

    const onToggleTaskDone = (taskId: string) =>
        setState(toggleTaskDone(state, taskId));

    const onToggleTaskInBlock = (taskId: string) => {
        const blockId = currentBlock?.id;
        if (!blockId) return;
        setState(toggleTaskInBlock(state, blockId, taskId));
    };

    const onAddTask = (title: string) => {
        const blockId = currentBlock?.id ?? null;
        const shouldAdd = addNewTaskToBlock && !!blockId;
        setState(
            addTask(state, categoryId, title, {
                addToCurrentBlock: shouldAdd,
                blockId,
            }),
        );
    };

    const onAddCategory = (name: string) => {
        if (activeBlock) return;
        const next = addCategory(state, name);
        setState(next);
        setCategoryId(
            next.categories[next.categories.length - 1]?.id ?? categoryId,
        );
    };

    return (
        <div className="space-y-6">
            {showFireworks && <FireworksOverlay />}

            <Topbar title="Focus" />

            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
                <div className="space-y-4">
                    <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold">
                                    Control
                                </div>
                                <div className="mt-1 text-xs text-muted">
                                    Planifica → inicia → ajusta tareas si hace
                                    falta.
                                </div>
                            </div>
                            <SyncButton state={state} />
                        </div>

                        {/* Ritual (no bloquea planificación) */}
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-semibold">
                                        Ritual de entrada
                                    </div>
                                    <div className="mt-1 text-xs text-white/55">
                                        {entered
                                            ? '✅ Listo por hoy. Start desbloqueado.'
                                            : 'No bloquea tu planificación. Solo desbloquea Start.'}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!entered && (
                                        <button
                                            type="button"
                                            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                                            onClick={() =>
                                                setRitualOpen((v) => !v)
                                            }
                                        >
                                            {ritualOpen ? 'Cerrar' : 'Abrir'}
                                        </button>
                                    )}

                                    {!entered && (
                                        <button
                                            type="button"
                                            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                                            onClick={() => {
                                                try {
                                                    const key =
                                                        new Intl.DateTimeFormat(
                                                            'en-CA',
                                                            {
                                                                timeZone:
                                                                    'America/Bogota',
                                                                year: 'numeric',
                                                                month: '2-digit',
                                                                day: '2-digit',
                                                            },
                                                        ).format(new Date());
                                                    localStorage.setItem(
                                                        `better-you-focus.ritual.${key}`,
                                                        'skipped',
                                                    );
                                                } catch {
                                                    // ignore
                                                }
                                                setEntered(true);
                                                setRitualOpen(false);
                                            }}
                                            title="No recomendado. Úsalo solo si necesitas arrancar ya."
                                        >
                                            Omitir hoy
                                        </button>
                                    )}
                                </div>
                            </div>

                            {ritualOpen && !entered && (
                                <div className="mt-3">
                                    <RitualGate
                                        onReady={() => {
                                            try {
                                                const key =
                                                    new Intl.DateTimeFormat(
                                                        'en-CA',
                                                        {
                                                            timeZone:
                                                                'America/Bogota',
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                        },
                                                    ).format(new Date());
                                                localStorage.setItem(
                                                    `better-you-focus.ritual.${key}`,
                                                    'done',
                                                );
                                            } catch {
                                                // ignore
                                            }
                                            setEntered(true);
                                            setRitualOpen(false);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                            <select
                                className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
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
                                    const name = prompt('Nombre de categoría:');
                                    if (name) onAddCategory(name);
                                }}
                                disabled={!!activeBlock}
                            >
                                + Grupo
                            </button>
                        </div>

                        {/* Tiempo */}
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">
                                    Tiempo del bloque
                                </div>
                                <div className="text-xs text-white/55">
                                    Actual: {Math.round(plannedSeconds / 60)}{' '}
                                    min
                                </div>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                                {TIME_PRESETS_MIN.map((m) => {
                                    const sec = m * 60;
                                    const active = plannedSeconds === sec;
                                    return (
                                        <button
                                            key={m}
                                            type="button"
                                            className={[
                                                'rounded-xl border px-3 py-2 text-sm',
                                                active
                                                    ? 'border-white/20 bg-white/10'
                                                    : 'border-white/10 bg-white/5 hover:bg-white/10',
                                            ].join(' ')}
                                            onClick={() =>
                                                applyPlannedSeconds(sec)
                                            }
                                            disabled={!!activeBlock}
                                        >
                                            {m}m
                                        </button>
                                    );
                                })}

                                <button
                                    type="button"
                                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                                    onClick={() => {
                                        if (activeBlock) return;
                                        const v = prompt(
                                            'Minutos personalizados (ej: 35):',
                                        );
                                        const m = Number(v);
                                        if (Number.isFinite(m) && m > 0)
                                            applyPlannedSeconds(
                                                Math.round(m) * 60,
                                            );
                                    }}
                                    disabled={!!activeBlock}
                                >
                                    Custom
                                </button>
                            </div>

                            <div className="mt-2 text-xs text-white/55">
                                {checkinRec ? (
                                    <span>
                                        Check-in sugiere:{' '}
                                        <span className="text-white/80">
                                            {checkinRec.blockMin}m
                                        </span>{' '}
                                        · WIP: {checkinRec.wip}.{' '}
                                        <Link
                                            href="/check-in"
                                            className="underline text-white/80 hover:text-white"
                                        >
                                            Ver / editar
                                        </Link>
                                    </span>
                                ) : (
                                    <span>
                                        Tip: si urge/ansiedad está alta, usa
                                        15–25m. Si estás estable, 45–60m.{' '}
                                        <Link
                                            href="/check-in"
                                            className="underline text-white/80 hover:text-white"
                                        >
                                            Haz check-in
                                        </Link>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Timer */}
                        <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
                            <div className="text-6xl font-semibold tracking-tight">
                                {mmss(secondsLeft)}
                            </div>
                            <div className="mt-2 text-sm text-muted">
                                {activeBlock
                                    ? 'Bloque activo'
                                    : 'Bloque planificado'}
                            </div>

                            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                {!running ? (
                                    <button
                                        className="rounded-2xl bg-accent/15 border border-white/10 px-4 py-2 text-sm hover:bg-accent/20"
                                        onClick={onStart}
                                    >
                                        {activeBlock
                                            ? 'Resume'
                                            : entered
                                              ? 'Start'
                                              : 'Start (requiere ritual)'}
                                    </button>
                                ) : (
                                    <button
                                        className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                                        onClick={onStop}
                                    >
                                        Pause
                                    </button>
                                )}

                                <button
                                    className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                                    onClick={onReset}
                                    disabled={running}
                                    title={
                                        running
                                            ? 'Pausa antes de reset'
                                            : 'Reset'
                                    }
                                >
                                    Reset
                                </button>

                                <button
                                    className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                                    onClick={() => {
                                        // volver a ver el ritual si quieres (no borra el flag del día)
                                        setRitualOpen(true);
                                    }}
                                    disabled={running}
                                    title={
                                        running ? 'Pausa antes' : 'Ver ritual'
                                    }
                                >
                                    Ritual
                                </button>

                                {activeBlock && (
                                    <button
                                        className="rounded-2xl bg-red-500/15 border border-white/10 px-4 py-2 text-sm hover:bg-red-500/20"
                                        onClick={onInterrupt}
                                        disabled={running}
                                        title={
                                            running
                                                ? 'Pausa antes de interrumpir'
                                                : 'Interrumpir con motivo'
                                        }
                                    >
                                        Interrumpir
                                    </button>
                                )}
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

                        {/* Añadir tarea */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">
                                    Crear task (rápido)
                                </div>
                                {currentBlock && (
                                    <label className="flex items-center gap-2 text-xs text-white/60">
                                        <input
                                            type="checkbox"
                                            checked={addNewTaskToBlock}
                                            onChange={(e) =>
                                                setAddNewTaskToBlock(
                                                    e.target.checked,
                                                )
                                            }
                                            className="h-4 w-4"
                                        />
                                        Añadir al bloque
                                    </label>
                                )}
                            </div>

                            <div className="mt-2 flex gap-2">
                                <input
                                    id="newTask"
                                    className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                                    placeholder="Ej: cerrar bug / hacer 1 commit / 10 min inglés"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const v = (
                                                e.target as HTMLInputElement
                                            ).value;
                                            if (v.trim()) onAddTask(v);
                                            (
                                                e.target as HTMLInputElement
                                            ).value = '';
                                        }
                                    }}
                                />
                                <button
                                    className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
                                    onClick={() => {
                                        const input = document.getElementById(
                                            'newTask',
                                        ) as HTMLInputElement | null;
                                        const v = input?.value ?? '';
                                        if (v.trim()) onAddTask(v);
                                        if (input) input.value = '';
                                    }}
                                >
                                    Add
                                </button>
                            </div>

                            <div className="mt-2 text-xs text-muted">
                                Durante Focus puedes agregar/quitar tasks del
                                bloque (sin editar títulos para no dispersarte).
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-surface2/50 p-5">
                    <FocusTasksPanel
                        state={state}
                        categoryId={categoryId}
                        currentBlockId={currentBlock?.id ?? null}
                        currentBlockStatus={currentBlockStatus}
                        nextPendingTaskId={nextPendingTaskId}
                        onToggleTaskDone={onToggleTaskDone}
                        onToggleTaskInBlock={onToggleTaskInBlock}
                        onChangeTaskPriority={(taskId, p) =>
                            setState(updateTaskPriority(state, taskId, p))
                        }
                        onChangeTaskCategory={(taskId, cId) =>
                            setState(updateTaskCategory(state, taskId, cId))
                        }
                        onChangeTaskDueAt={(taskId, iso) =>
                            setState(updateTaskDueAt(state, taskId, iso))
                        }
                        onChangeTaskRepeat={(taskId, cadence, time) =>
                            setState(
                                updateTaskRepeat(
                                    state,
                                    taskId,
                                    cadence as any,
                                    time ?? null,
                                ),
                            )
                        }
                        onChangeTaskEstimate={(taskId, minutes) =>
                            setState(updateTaskEstimate(state, taskId, minutes))
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
                        const block = state.blocks.find(
                            (b) => b.id === showSummaryForBlockId,
                        );
                        if (block) setCategoryId(block.categoryId);
                        setSecondsLeft(plannedSeconds);
                    }}
                />
            )}
        </div>
    );
}
