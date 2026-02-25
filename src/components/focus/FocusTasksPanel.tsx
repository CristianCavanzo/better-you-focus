"use client";

import { FocusState } from "@/src/types/focus";
import { getSelectedTasks } from "@/src/lib/focusLogic";

export function FocusTasksPanel({
  state,
  activeBlockId,
  categoryId,
  nextPendingTaskId,
  onToggleTask
}: {
  state: FocusState;
  activeBlockId: string | null;
  categoryId: string;
  nextPendingTaskId: string | null;
  onToggleTask: (taskId: string) => void;
}) {
  const allTasks = state.tasks
    .filter((t) => t.categoryId === categoryId && t.status !== "ARCHIVED")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const selected = activeBlockId ? getSelectedTasks(state, activeBlockId) : [];

  return (
    <div className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tareas</h2>
          <p className="mt-1 text-sm text-white/60">
            {activeBlockId
              ? "Estas son las tareas seleccionadas para este bloque."
              : "Inicia un bloque para seleccionar tareas automáticamente."}
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
                </label>
              );
            })
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          {allTasks.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              No hay tareas en esta categoría. Agrega una a la izquierda.
            </div>
          ) : (
            allTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <div className="text-sm">{t.title}</div>
                <div className="text-xs text-white/55">{t.status === "DONE" ? "DONE" : "PENDING"}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
