"use client";

import { FocusState } from "@/src/types/focus";
import { getSelectedTasks } from "@/src/lib/focusLogic";

export function FocusTasksPanel({
  state,
  activeBlockId,
  categoryId,
  nextPendingTaskId,
  onToggleTask,
  onSetPriority,
  draftSelectedTaskIds,
  onToggleDraftSelect,
  onAddTaskToActiveBlock
}: {
  state: FocusState;
  activeBlockId: string | null;
  categoryId: string;
  nextPendingTaskId: string | null;
  onToggleTask: (taskId: string) => void;
  onSetPriority: (taskId: string, priority: number) => void;
  draftSelectedTaskIds: string[];
  onToggleDraftSelect: (taskId: string) => void;
  onAddTaskToActiveBlock: (taskId: string) => void;
}) {
  const allTasks = state.tasks
    .filter((t) => t.categoryId === categoryId && t.status !== "ARCHIVED")
    .sort((a, b) => ((a.priority ?? 2) - (b.priority ?? 2)) || (a.sortOrder - b.sortOrder));

  const selected = activeBlockId ? getSelectedTasks(state, activeBlockId) : [];

  const selectedIds = new Set(selected.map((x) => x.task.id));
  const addable = activeBlockId
    ? allTasks.filter((t) => t.status === "PENDING" && !selectedIds.has(t.id))
    : [];

  const priorityLabel = (p: number | undefined) =>
    p === 1 ? "Alta" : p === 2 ? "Media" : p === 3 ? "Baja" : "Opcional";

  return (
    <div className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tareas</h2>
          <p className="mt-1 text-sm text-white/60">
            {activeBlockId
              ? "Estas son las tareas seleccionadas para este bloque."
              : "Selecciona (checkbox) lo que quieres en el próximo bloque, o deja vacío para auto-pick."}
          </p>
        </div>
        {activeBlockId && (
          <div className="text-xs text-white/55">
            Auto-avance: <span className="text-white/80">siguiente pendiente</span>
          </div>
        )}
      </div>

      {activeBlockId ? (
        <div className="mt-4 grid gap-2">
          {selected.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              No hay tareas pendientes en esta categoría. Añade tareas y reinicia.
            </div>
          ) : (
            selected.map(({ selection, task }) => {
              const done = task.status === "DONE";
              const isNext = !done && nextPendingTaskId === task.id;
              return (
                <label
                  key={selection.id}
                  className={[
                    "flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer select-none",
                    done ? "border-white/10 bg-white/5 opacity-80" : "border-white/10 bg-black/20 hover:bg-black/25",
                    isNext ? "ring-2 ring-emerald-400/30" : ""
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => onToggleTask(task.id)}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{task.title}</div>
                    <div className="mt-0.5 text-xs text-white/55">
                      {done ? "✅ completada" : isNext ? "➡️ siguiente" : "pendiente"}
                    </div>
                  </div>

                  <select
                    className="rounded-xl bg-black/20 border border-white/10 px-2 py-1 text-xs"
                    value={task.priority ?? 2}
                    onChange={(e) => onSetPriority(task.id, Number(e.target.value))}
                    title="Prioridad"
                  >
                    {[1, 2, 3, 4].map((p) => (
                      <option key={p} value={p}>
                        {priorityLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })
          )}

          {addable.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3">
              <div className="text-xs text-white/60">Añadir al bloque (rápido)</div>
              <div className="mt-2 grid gap-2">
                {addable.slice(0, 6).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className="text-sm truncate">{t.title}</div>
                    <button
                      className="rounded-xl bg-white/5 border border-white/10 px-3 py-1 text-xs hover:bg-white/10"
                      onClick={() => onAddTaskToActiveBlock(t.id)}
                      type="button"
                    >
                      + Añadir
                    </button>
                  </div>
                ))}
              </div>
              {addable.length > 6 && (
                <div className="mt-2 text-[11px] text-white/45">…y {addable.length - 6} más</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          {allTasks.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              No hay tareas en esta categoría. Agrega una a la izquierda.
            </div>
          ) : (
            allTasks.map((t) => {
              const checked = draftSelectedTaskIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  <label className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleDraftSelect(t.id)}
                      className="h-4 w-4"
                    />
                    <div className="min-w-0">
                      <div className="text-sm truncate">{t.title}</div>
                      <div className="text-xs text-white/55">
                        {t.status === "DONE" ? "DONE" : "PENDING"} · {priorityLabel(t.priority)}
                      </div>
                    </div>
                  </label>

                  <select
                    className="shrink-0 rounded-xl bg-black/20 border border-white/10 px-2 py-1 text-xs"
                    value={t.priority ?? 2}
                    onChange={(e) => onSetPriority(t.id, Number(e.target.value))}
                    title="Prioridad"
                  >
                    {[1, 2, 3, 4].map((p) => (
                      <option key={p} value={p}>
                        {priorityLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
