"use client";

import { FocusState } from "@/src/types/focus";
import {
  getSelectedTasks,
  isTaskInBlock,
  getBlockSelections
} from "@/src/lib/focusLogic";

const PRIORITIES = [
  { v: 1, label: "Alta" },
  { v: 2, label: "Media" },
  { v: 3, label: "Baja" },
  { v: 4, label: "Opcional" }
];

export function FocusTasksPanel({
  state,
  categoryId,
  currentBlockId,
  currentBlockStatus,
  nextPendingTaskId,
  onToggleTaskDone,
  onToggleTaskInBlock,
  onChangeTaskPriority,
  onChangeTaskCategory,
  onChangeTaskDueAt,
  onChangeTaskRepeat,
  onChangeTaskEstimate
}: {
  state: FocusState;
  categoryId: string;
  currentBlockId: string | null;
  currentBlockStatus: "DRAFT" | "ACTIVE" | null;
  nextPendingTaskId: string | null;
  onToggleTaskDone: (taskId: string) => void;
  onToggleTaskInBlock: (taskId: string) => void;
  onChangeTaskPriority: (taskId: string, priority: number) => void;
  onChangeTaskCategory: (taskId: string, nextCategoryId: string) => void;
  onChangeTaskDueAt: (taskId: string, dueAtIso: string | null) => void;
  onChangeTaskRepeat: (taskId: string, cadence: "NONE" | "DAILY" | "WEEKDAYS", time?: string | null) => void;
  onChangeTaskEstimate: (taskId: string, minutes: number | null) => void;
}) {
  const categories = state.categories.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  const now = new Date();
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-CO", {
      weekday: "short",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  };

  const isOverdue = (iso?: string | null) => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return Number.isFinite(t) && t < now.getTime();
  };

  const schedulePrompt = (taskId: string, current?: string | null) => {
    const base = current ? new Date(current) : now;
    const dateDefault = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(base);
    const timeDefault = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(base);

    const date = prompt("Fecha (YYYY-MM-DD)", dateDefault);
    if (!date) return;
    const time = prompt("Hora límite (HH:MM) — opcional", timeDefault) ?? "";
    const hhmm = time.trim() || "23:59";
    const iso = new Date(`${date}T${hhmm}:00`).toISOString();
    onChangeTaskDueAt(taskId, iso);
  };

  const repeatPrompt = (taskId: string, cadence: "NONE" | "DAILY" | "WEEKDAYS") => {
    if (cadence === "NONE") {
      onChangeTaskRepeat(taskId, "NONE", null);
      return;
    }
    const time = prompt("Hora sugerida (HH:MM) — opcional", "08:00") ?? "";
    const hhmm = time.trim() || null;
    onChangeTaskRepeat(taskId, cadence, hhmm);
  };

  const allTasks = state.tasks
    .filter((t) => t.status !== "ARCHIVED")
    .sort((a, b) => (a.categoryId.localeCompare(b.categoryId) || (a.priority - b.priority) || (Date.parse(a.dueAt ?? "") || 9e15) - (Date.parse(b.dueAt ?? "") || 9e15) || (a.sortOrder - b.sortOrder)));

  const tasksInCategory = allTasks.filter((t) => t.categoryId === categoryId);

  const selected = currentBlockId ? getSelectedTasks(state, currentBlockId) : [];
  const selectedCount = currentBlockId ? getBlockSelections(state, currentBlockId).length : 0;

  const currentBlock = currentBlockId ? state.blocks.find((b) => b.id === currentBlockId) : null;
  const plannedMin = currentBlock ? Math.round((currentBlock.plannedSeconds ?? 0) / 60) : null;
  const estMin = selected.reduce((a, x) => a + (x.task.estimateMinutes ?? 0), 0);

  // Agenda: hoy/mañana (y atrasadas) a nivel global
  const agenda = allTasks
    .filter((t) => t.status === "PENDING" && !!t.dueAt)
    .filter((t) => {
      const due = Date.parse(t.dueAt ?? "");
      if (!Number.isFinite(due)) return false;
      const diffH = (due - now.getTime()) / 36e5;
      return diffH <= 36; // próximas 36h o atrasadas
    })
    .sort((a, b) => (a.priority - b.priority) || (Date.parse(a.dueAt ?? "") - Date.parse(b.dueAt ?? "")));

  return (
    <div className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tareas</h2>
          <p className="mt-1 text-sm text-white/60">
            {currentBlockStatus
              ? currentBlockStatus === "ACTIVE"
                ? "Durante Focus puedes agregar o quitar tareas del bloque."
                : "Selecciona qué harás en el bloque antes de iniciar."
              : "Prepara un bloque seleccionando categoría y tiempo."}
          </p>
        </div>
        {!!currentBlockId && (
          <div className="text-xs text-white/55">
            En bloque: <span className="text-white/80">{selectedCount}</span>
          </div>
        )}
      </div>

      {/* Bloque */}
      {currentBlockId && (
        <div className="mt-4">
          <div className="text-sm font-semibold">Bloque {currentBlockStatus === "ACTIVE" ? "(activo)" : "(planificado)"}</div>
          <div className="mt-1 text-xs text-white/55">
            Orden automático: prioridad → deadline. {plannedMin != null && (
              <span>
                Plan: <span className="text-white/80">{plannedMin}m</span> · Estimado: <span className={estMin > (plannedMin ?? 0) ? "text-red-300" : "text-white/80"}>{estMin}m</span>
              </span>
            )}
          </div>

          {selectedCount > 5 && (
            <div className="mt-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
              Estás metiendo demasiadas tasks en un bloque. WIP alto = fricción + abandono. Prueba 1–3.
            </div>
          )}
          <div className="mt-2 grid gap-2">
            {selected.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                No hay tareas seleccionadas. Marca tareas abajo para incluirlas.
              </div>
            ) : (
              selected.map(({ selection, task }) => {
                const done = task.status === "DONE";
                const isNext = currentBlockStatus === "ACTIVE" && !done && nextPendingTaskId === task.id;
                return (
                  <div
                    key={selection.id}
                    className={[
                      "flex items-center gap-3 rounded-xl border px-3 py-3",
                      done
                        ? "border-white/10 bg-white/5 opacity-80"
                        : "border-white/10 bg-black/20 hover:bg-black/25",
                      isNext ? "ring-2 ring-emerald-400/30" : ""
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => onToggleTaskDone(task.id)}
                      className="h-4 w-4"
                    />

                    <div className="flex-1">
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="mt-0.5 text-xs text-white/55">
                        {done ? "✅ completada" : isNext ? "➡️ siguiente" : "pendiente"}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                      onClick={() => onToggleTaskInBlock(task.id)}
                      title="Quitar del bloque"
                    >
                      Quitar
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Agenda */}
      <div className="mt-6">
        <div className="text-sm font-semibold">Agenda (hoy / mañana)</div>
        <div className="mt-2 grid gap-2">
          {agenda.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              Sin vencimientos próximos. Si tienes algo “para hoy”, ponle fecha/hora (📅).
            </div>
          ) : (
            agenda.map((t) => {
              const overdue = isOverdue(t.dueAt);
              const inBlock = currentBlockId ? isTaskInBlock(state, currentBlockId, t.id) : false;
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  {!!currentBlockId && (
                    <input
                      type="checkbox"
                      checked={inBlock}
                      onChange={() => onToggleTaskInBlock(t.id)}
                      className="h-4 w-4"
                      title={inBlock ? "Quitar del bloque" : "Agregar al bloque"}
                    />
                  )}

                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className={overdue ? "mt-0.5 text-xs text-red-300" : "mt-0.5 text-xs text-white/55"}>
                      {t.dueAt ? `⏰ ${fmtDate(t.dueAt)}` : ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                    onClick={() => schedulePrompt(t.id, t.dueAt ?? null)}
                    title="Cambiar fecha/hora"
                  >
                    📅
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Backlog */}
      <div className="mt-6">
        <div className="text-sm font-semibold">Backlog (categoría actual)</div>
        <div className="mt-2 grid gap-2">
          {tasksInCategory.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              No hay tareas aquí. Crea una desde el panel izquierdo.
            </div>
          ) : (
            tasksInCategory.map((t) => {
              const inBlock = currentBlockId ? isTaskInBlock(state, currentBlockId, t.id) : false;
              const overdue = isOverdue(t.dueAt);
              return (
                <div
                  key={t.id}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    {!!currentBlockId && (
                      <label className="flex items-center gap-2 text-xs text-white/65">
                        <input
                          type="checkbox"
                          checked={inBlock}
                          onChange={() => onToggleTaskInBlock(t.id)}
                          className="h-4 w-4"
                        />
                        Bloque
                      </label>
                    )}

                    <label className="flex items-center gap-2 text-xs text-white/65">
                      <input
                        type="checkbox"
                        checked={t.status === "DONE"}
                        onChange={() => onToggleTaskDone(t.id)}
                        className="h-4 w-4"
                      />
                      Done
                    </label>

                    <div className="flex-1 text-sm font-medium">{t.title}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-[11px] text-white/55">Fecha límite</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={
                            overdue
                              ? "rounded-xl bg-red-500/15 border border-white/10 px-3 py-2 text-xs hover:bg-red-500/20"
                              : "rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                          }
                          onClick={() => schedulePrompt(t.id, t.dueAt ?? null)}
                          title="Programar"
                        >
                          {t.dueAt ? fmtDate(t.dueAt) : "📅 Programar"}
                        </button>
                        {t.dueAt && (
                          <button
                            type="button"
                            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs hover:bg-white/10"
                            onClick={() => onChangeTaskDueAt(t.id, null)}
                            title="Quitar fecha"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] text-white/55">Repetir</div>
                      <select
                        value={t.repeatCadence ?? "NONE"}
                        onChange={(e) => repeatPrompt(t.id, e.target.value as any)}
                        className="w-full rounded-xl bg-black/20 border border-white/10 px-2 py-2 text-sm"
                      >
                        <option value="NONE">No</option>
                        <option value="DAILY">Diaria</option>
                        <option value="WEEKDAYS">Lun–Vie</option>
                      </select>
                      {(t.repeatCadence ?? "NONE") !== "NONE" && (
                        <div className="text-[11px] text-white/45">Hora: {t.repeatTime ?? "(sin)"}</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="space-y-1">
                      <div className="text-[11px] text-white/55">Prioridad</div>
                      <select
                        value={t.priority}
                        onChange={(e) => onChangeTaskPriority(t.id, Number(e.target.value))}
                        className="w-full rounded-xl bg-black/20 border border-white/10 px-2 py-2 text-sm"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p.v} value={p.v}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <div className="text-[11px] text-white/55">Grupo</div>
                      <select
                        value={t.categoryId}
                        onChange={(e) => onChangeTaskCategory(t.id, e.target.value)}
                        className="w-full rounded-xl bg-black/20 border border-white/10 px-2 py-2 text-sm"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <div className="text-[11px] text-white/55">Estimación</div>
                      <input
                        type="number"
                        min={1}
                        max={480}
                        value={t.estimateMinutes ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          onChangeTaskEstimate(t.id, v === "" ? null : Number(v));
                        }}
                        placeholder="min"
                        className="w-full rounded-xl bg-black/20 border border-white/10 px-2 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
