"use client";

import { FocusState, Category } from "@/src/types/focus";
import { getSelectedTasks, isTaskSelectedInBlock } from "@/src/lib/focusLogic";

function priorityLabel(p: number) {
  if (p === 1) return "Alta";
  if (p === 2) return "Media";
  if (p === 3) return "Baja";
  return "Opcional";
}

export function FocusTasksPanel({
  state,
  currentCategoryId,
  currentBlockId,
  currentBlockStatus,
  nextPendingTaskId,
  categories,
  onToggleTaskDone,
  onToggleTaskInBlock,
  onSetPriority,
  onMoveTask
}: {
  state: FocusState;
  currentCategoryId: string;
  currentBlockId: string | null;
  currentBlockStatus: string;
  nextPendingTaskId: string | null;
  categories: Category[];
  onToggleTaskDone: (taskId: string) => void;
  onToggleTaskInBlock: (taskId: string, checked: boolean) => void;
  onSetPriority: (taskId: string, priority: 1 | 2 | 3 | 4) => void;
  onMoveTask: (taskId: string, categoryId: string) => void;
}) {
  const inCategory = state.tasks
    .filter((t) => t.categoryId === currentCategoryId && t.status !== "ARCHIVED")
    .slice()
    .sort((a, b) => {
      // pending first
      if (a.status !== b.status) return a.status === "PENDING" ? -1 : 1;
      // then priority
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.sortOrder - b.sortOrder;
    });

  const selected = currentBlockId ? getSelectedTasks(state, currentBlockId) : [];

  const title = currentBlockStatus === "ACTIVE" ? "Bloque activo" : "Prepara tu bloque";

  return (
    <div className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-white/60">
            {currentBlockStatus === "ACTIVE"
              ? "Puedes agregar o quitar tasks del bloque sin salir del Focus."
              : "Selecciona 1–5 tasks para el bloque. Si no eliges, la app auto-selecciona."}
          </p>
        </div>
        {currentBlockStatus === "ACTIVE" && (
          <div className="text-xs text-white/55">
            Auto-avance: <span className="text-white/80">siguiente pendiente</span>
          </div>
        )}
      </div>

      {/* Selected */}
      <div className="mt-4">
        <div className="text-sm font-semibold">Tasks en el bloque</div>
        <div className="mt-2 grid gap-2">
          {!currentBlockId ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              No hay bloque editable. (Esto no debería pasar; refresca.)
            </div>
          ) : selected.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              Aún no seleccionas tasks.
            </div>
          ) : (
            selected.map(({ selection, task }) => {
              const done = task.status === "DONE";
              const isNext = !done && nextPendingTaskId === task.id;
              return (
                <div
                  key={selection.id}
                  className={[
                    "flex items-center gap-3 rounded-xl border px-3 py-3",
                    done ? "border-white/10 bg-white/5 opacity-80" : "border-white/10 bg-black/20 hover:bg-black/25",
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
                      {done ? "✅ completada" : isNext ? "➡️ siguiente" : "pendiente"} · {priorityLabel(task.priority)}
                    </div>
                  </div>
                  <button
                    className="rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                    type="button"
                    onClick={() => onToggleTaskInBlock(task.id, false)}
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

      {/* Backlog */}
      <div className="mt-6">
        <div className="text-sm font-semibold">Backlog ({categories.find((c) => c.id === currentCategoryId)?.name ?? ""})</div>
        <div className="mt-2 grid gap-2">
          {inCategory.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              No hay tasks en este grupo.
            </div>
          ) : (
            inCategory.map((t) => {
              const inBlock = currentBlockId ? isTaskSelectedInBlock(state, currentBlockId, t.id) : false;
              const done = t.status === "DONE";

              return (
                <div
                  key={t.id}
                  className={
                    "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-white/10 " +
                    (done ? "bg-white/5 opacity-80" : "bg-black/20 hover:bg-black/25")
                  }
                >
                  <label className="flex items-center gap-2 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={inBlock}
                      onChange={(e) => onToggleTaskInBlock(t.id, e.target.checked)}
                      className="h-4 w-4"
                      disabled={!currentBlockId}
                      title={!currentBlockId ? "No hay bloque editable" : "Agregar/Quitar del bloque"}
                    />
                    <span className="text-[11px] text-white/55">Bloque</span>
                  </label>

                  <div className="py-3 pr-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleTaskDone(t.id)}
                        className="text-left"
                        title="Marcar DONE/PENDING"
                      >
                        <div className="text-sm font-medium">{t.title}</div>
                        <div className="mt-0.5 text-xs text-white/55">
                          {done ? "DONE" : "PENDING"} · {priorityLabel(t.priority)}
                        </div>
                      </button>

                      <select
                        value={t.priority}
                        onChange={(e) => onSetPriority(t.id, Number(e.target.value) as any)}
                        className="rounded-xl bg-black/20 border border-white/10 px-2 py-1 text-xs"
                        title="Prioridad"
                      >
                        <option value={1}>Alta</option>
                        <option value={2}>Media</option>
                        <option value={3}>Baja</option>
                        <option value={4}>Opcional</option>
                      </select>
                    </div>
                  </div>

                  <div className="px-3 py-3">
                    <select
                      value={t.categoryId}
                      onChange={(e) => onMoveTask(t.id, e.target.value)}
                      className="rounded-xl bg-black/20 border border-white/10 px-2 py-1 text-xs"
                      title="Mover a otro grupo"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
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
