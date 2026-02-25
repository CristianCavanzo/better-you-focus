"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addCategory,
  addTask,
  addTaskToBlock,
  addTaskWithId,
  endBlock,
  getActiveBlock,
  getNextPendingSelection,
  setCategoryDefaultSeconds,
  setTaskPriority,
  startBlock,
  toggleTaskDone
} from "@/src/lib/focusLogic";
import { FocusEndSummary } from "@/src/components/focus/FocusEndSummary";
import { FireworksOverlay } from "@/src/components/focus/FireworksOverlay";
import { SyncButton } from "@/src/components/focus/SyncButton";
import { FocusTasksPanel } from "@/src/components/focus/FocusTasksPanel";
import { useFocusLocalState } from "@/src/hooks/useFocusLocalState";
import { Topbar } from "@/src/components/shell/Topbar";
import { RitualGate } from "@/src/components/focus/RitualGate";
import { PanicButton } from "@/src/components/focus/PanicButton";
import { cn } from "@/src/lib/ui";

const DEFAULT_POMODORO_SECONDS = 25 * 60;

const PRESET_MINUTES = [15, 25, 45, 60, 90];

export default function FocusPage() {
  const { state, setState, hydrateFromServer } = useFocusLocalState();

  const [categoryId, setCategoryId] = useState<string>("work");
  const [plannedSeconds, setPlannedSeconds] = useState<number>(DEFAULT_POMODORO_SECONDS);
  const [secondsLeft, setSecondsLeft] = useState<number>(DEFAULT_POMODORO_SECONDS);
  const [running, setRunning] = useState(false);
  const [showSummaryForBlockId, setShowSummaryForBlockId] = useState<string | null>(null);
  const [showFireworks, setShowFireworks] = useState(false);
  const [entered, setEntered] = useState(false);

  // Selección manual para el próximo bloque (cuando aún no hay bloque activo).
  const [draftSelectedTaskIds, setDraftSelectedTaskIds] = useState<string[]>([]);

  const activeBlock = useMemo(() => getActiveBlock(state), [state]);
  const nextPendingTaskId = useMemo(
    () => (activeBlock ? getNextPendingSelection(state, activeBlock.id) : null),
    [state, activeBlock]
  );

  useEffect(() => {
    hydrateFromServer().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-sync (bajo ruido): guarda cambios en DB sin depender del botón.
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/focus/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state })
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft > 0) return;

    setRunning(false);
    if (activeBlock) {
      const actual = activeBlock.plannedSeconds;
      const next = endBlock(state, activeBlock.id, actual, { status: "COMPLETED" });
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
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(Math.floor(s % 60)).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const categories = state.categories.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  // Cuando cambia la categoría (y no hay bloque activo), ajusta el tiempo por defecto.
  useEffect(() => {
    if (activeBlock) return;
    const cat = categories.find((c) => c.id === categoryId);
    const nextPlanned = cat?.defaultSeconds ?? DEFAULT_POMODORO_SECONDS;
    setPlannedSeconds(nextPlanned);
    setSecondsLeft(nextPlanned);
    setDraftSelectedTaskIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const onStart = () => {
    if (!entered) return;
    if (activeBlock) {
      setRunning(true);
      return;
    }
    // persiste el "defaultSeconds" de la categoría
    const withDefault = setCategoryDefaultSeconds(state, categoryId, plannedSeconds);
    const next = startBlock(withDefault, categoryId, plannedSeconds, 5, draftSelectedTaskIds);
    setState(next);
    setSecondsLeft(plannedSeconds);
    setRunning(true);
    setDraftSelectedTaskIds([]);
  };

  const onStop = () => setRunning(false);

  const onReset = () => {
    setRunning(false);
    setSecondsLeft(plannedSeconds);
  };

  const onToggleTask = (taskId: string) => setState(toggleTaskDone(state, taskId));

  const onAddTask = (title: string) => {
    // Si hay bloque activo, el "quick add" se asigna automáticamente al bloque.
    if (activeBlock) {
      const created = addTaskWithId(state, categoryId, title);
      const linked = addTaskToBlock(created.state, activeBlock.id, created.taskId);
      setState(linked);
      return;
    }

    const next = addTask(state, categoryId, title);
    setState(next);
  };

  const onSetPriority = (taskId: string, priority: number) =>
    setState(setTaskPriority(state, taskId, priority));

  const onToggleDraftSelect = (taskId: string) => {
    setDraftSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((x) => x !== taskId) : [...prev, taskId]
    );
  };

  const onInterrupt = () => {
    if (!activeBlock) return;
    setRunning(false);
    const elapsed = Math.max(0, activeBlock.plannedSeconds - secondsLeft);
    const reason =
      prompt(
        "¿Por qué interrumpiste el bloque?\nEj: urgencia, distracción, reunión, cansancio...",
      ) ?? "";
    const next = endBlock(state, activeBlock.id, elapsed, {
      status: "INTERRUPTED",
      endReason: reason.trim() || "Interrumpido"
    });
    setState(next);
    setShowSummaryForBlockId(activeBlock.id);
  };

  const onAddCategory = (name: string) => {
    const next = addCategory(state, name);
    setState(next);
    setCategoryId(next.categories[next.categories.length - 1]?.id ?? categoryId);
  };

  return (
    <div className="space-y-6">
      {showFireworks && <FireworksOverlay />}

      <Topbar title="Focus" />

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
        <div className="space-y-4">
          {!entered ? (
            <RitualGate onReady={() => setEntered(true)} />
          ) : (
            <>
              <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Control</div>
                    <div className="mt-1 text-xs text-muted">Categoría → bloque → completar.</div>
                  </div>
                  <SyncButton state={state} />
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

                  <select
                    className="rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                    value={Math.round(plannedSeconds / 60)}
                    onChange={(e) => {
                      const mins = Number(e.target.value);
                      const next = Math.max(1, mins) * 60;
                      setPlannedSeconds(next);
                      if (!activeBlock && !running) setSecondsLeft(next);
                      // persistimos el defaultSeconds en la categoría
                      if (!activeBlock) setState(setCategoryDefaultSeconds(state, categoryId, next));
                    }}
                    disabled={!!activeBlock}
                    title="Tiempo del bloque"
                  >
                    {(() => {
                      const m = Math.round(plannedSeconds / 60);
                      return PRESET_MINUTES.includes(m) ? null : (
                        <option key="__custom" value={m}>
                          {m}m
                        </option>
                      );
                    })()}
                    {PRESET_MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m}m
                      </option>
                    ))}
                  </select>

                  <button
                    className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
                    onClick={() => {
                      if (activeBlock) return;
                      const raw = prompt("Minutos para este bloque:", String(Math.round(plannedSeconds / 60)));
                      const mins = Number(raw);
                      if (!Number.isFinite(mins) || mins <= 0) return;
                      const next = Math.round(mins) * 60;
                      setPlannedSeconds(next);
                      setSecondsLeft(next);
                      setState(setCategoryDefaultSeconds(state, categoryId, next));
                    }}
                    disabled={!!activeBlock}
                    type="button"
                    title="Tiempo personalizado"
                  >
                    Custom
                  </button>

                  <button
                    className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
                    onClick={() => {
                      const name = prompt("Nombre de categoría:");
                      if (name) onAddCategory(name);
                    }}
                    disabled={!!activeBlock}
                  >
                    + Cat
                  </button>
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
                  <div className="text-6xl font-semibold tracking-tight">{mmss(secondsLeft)}</div>
                  <div className="mt-2 text-sm text-muted">
                    {activeBlock ? "Bloque activo" : "Listo para iniciar"}
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-2">
                    {!running ? (
                      <button
                        className="rounded-2xl bg-accent/15 border border-white/10 px-4 py-2 text-sm hover:bg-accent/20"
                        onClick={onStart}
                      >
                        Start
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
                    >
                      Reset
                    </button>

                    {activeBlock && (
                      <button
                        className="rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-sm hover:bg-rose-500/15"
                        onClick={onInterrupt}
                        disabled={running}
                        title={running ? "Pausa antes de interrumpir" : "Termina el bloque antes de tiempo"}
                      >
                        Interrumpir
                      </button>
                    )}

                    <button
                      className="rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                      onClick={() => setEntered(false)}
                      disabled={running}
                      title={running ? "Pausa antes de salir" : "Volver al ritual"}
                    >
                      Salir
                    </button>
                  </div>

                  {activeBlock && (
                    <div className="mt-4 text-xs text-muted">
                      Próxima tarea:{" "}
                      <span className={cn(nextPendingTaskId ? "text-white/85" : "text-accent")}>
                        {nextPendingTaskId ? "pendiente" : "✅ todas listas"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">Acción anti-recaída</div>
                  <PanicButton categoryId={categoryId} />
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold">Añadir tarea</div>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="newTask"
                      className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                      placeholder="Ej: enviar PR / estudiar 20 min / etc."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = (e.target as HTMLInputElement).value;
                          if (v.trim()) onAddTask(v);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                    <button
                      className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
                      onClick={() => {
                        const input = document.getElementById("newTask") as HTMLInputElement | null;
                        const v = input?.value ?? "";
                        if (v.trim()) onAddTask(v);
                        if (input) input.value = "";
                      }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    {activeBlock
                      ? "Quick add: se asigna automáticamente al bloque."
                      : "Puedes seleccionar manualmente tareas para el próximo bloque en el panel de la derecha."}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-surface2/50 p-5">
          <FocusTasksPanel
            state={state}
            activeBlockId={activeBlock?.id ?? null}
            categoryId={categoryId}
            nextPendingTaskId={nextPendingTaskId}
            onToggleTask={onToggleTask}
            onSetPriority={onSetPriority}
            draftSelectedTaskIds={draftSelectedTaskIds}
            onToggleDraftSelect={onToggleDraftSelect}
            onAddTaskToActiveBlock={(taskId) => {
              if (!activeBlock) return;
              setState(addTaskToBlock(state, activeBlock.id, taskId));
            }}
          />
        </div>
      </div>

      {showSummaryForBlockId && (
        <FocusEndSummary
          state={state}
          blockId={showSummaryForBlockId}
          onClose={() => {
            setShowSummaryForBlockId(null);
            const block = state.blocks.find((b) => b.id === showSummaryForBlockId);
            if (block) setCategoryId(block.categoryId);
            const planned = block?.plannedSeconds ?? DEFAULT_POMODORO_SECONDS;
            setPlannedSeconds(planned);
            setSecondsLeft(planned);
          }}
        />
      )}
    </div>
  );
}
