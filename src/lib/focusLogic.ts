import { FocusState, TaskStatus, BlockStatus, Task } from "@/src/types/focus";
import { cuidLike, nowIso } from "@/src/lib/ids";

const DEFAULT_SECONDS = 25 * 60;

export const DEFAULT_CATEGORIES = [
  { id: "work", name: "Trabajo", sortOrder: 0, defaultSeconds: DEFAULT_SECONDS },
  { id: "study", name: "Estudio", sortOrder: 1, defaultSeconds: DEFAULT_SECONDS },
  { id: "gym", name: "Gym", sortOrder: 2, defaultSeconds: DEFAULT_SECONDS }
];

export function makeInitialState(): FocusState {
  const now = nowIso();
  return {
    version: 1,
    lastLocalEditAt: now,
    categories: DEFAULT_CATEGORIES,
    tasks: [
      {
        id: "t1",
        categoryId: "work",
        title: "Abrir repo y elegir 1 tarea",
        status: "PENDING",
        sortOrder: 0,
        priority: 2
      },
      {
        id: "t2",
        categoryId: "work",
        title: "Implementar 1 cambio pequeño",
        status: "PENDING",
        sortOrder: 1,
        priority: 2
      },
      {
        id: "t3",
        categoryId: "study",
        title: "Leer 10 min (1 tema)",
        status: "PENDING",
        sortOrder: 0,
        priority: 3
      }
    ],
    blocks: [],
    selections: []
  };
}

export function touch(state: FocusState): FocusState {
  return { ...state, lastLocalEditAt: nowIso() };
}

export function addCategory(state: FocusState, name: string): FocusState {
  const id = cuidLike();
  const sortOrder = state.categories.length;
  return touch({
    ...state,
    categories: [
      ...state.categories,
      {
        id,
        name: name.trim() || "Nueva categoría",
        sortOrder,
        defaultSeconds: DEFAULT_SECONDS
      }
    ]
  });
}

export function setCategoryDefaultSeconds(state: FocusState, categoryId: string, seconds: number): FocusState {
  const safe = Math.max(5 * 60, Math.min(4 * 60 * 60, Math.floor(seconds)));
  const categories = state.categories.map((c) => (c.id === categoryId ? { ...c, defaultSeconds: safe } : c));
  return touch({ ...state, categories });
}

function nextTaskSortOrder(state: FocusState, categoryId: string) {
  const existing = state.tasks.filter((t) => t.categoryId === categoryId);
  return existing.length ? Math.max(...existing.map((t) => t.sortOrder)) + 1 : 0;
}

export function addTask(
  state: FocusState,
  categoryId: string,
  title: string,
  opts?: { priority?: 1 | 2 | 3 | 4; notes?: string | null }
): FocusState {
  const id = cuidLike();
  const sortOrder = nextTaskSortOrder(state, categoryId);
  const priority = opts?.priority ?? 2;
  return touch({
    ...state,
    tasks: [
      ...state.tasks,
      {
        id,
        categoryId,
        title: title.trim() || "Nueva tarea",
        status: "PENDING",
        sortOrder,
        priority,
        notes: opts?.notes ?? null
      }
    ]
  });
}

export function addTaskAndSelect(
  state: FocusState,
  categoryId: string,
  title: string,
  blockId: string | null,
  opts?: { priority?: 1 | 2 | 3 | 4; notes?: string | null }
): FocusState {
  const id = cuidLike();
  const sortOrder = nextTaskSortOrder(state, categoryId);
  const priority = opts?.priority ?? 2;
  const now = nowIso();

  let next: FocusState = touch({
    ...state,
    tasks: [
      ...state.tasks,
      {
        id,
        categoryId,
        title: title.trim() || "Nueva tarea",
        status: "PENDING",
        sortOrder,
        priority,
        notes: opts?.notes ?? null,
        selectedAt: blockId ? now : null
      }
    ]
  });

  if (blockId) next = addTaskToBlock(next, blockId, id);
  return next;
}

export function setTaskPriority(state: FocusState, taskId: string, priority: 1 | 2 | 3 | 4): FocusState {
  const tasks = state.tasks.map((t) => (t.id === taskId ? { ...t, priority } : t));
  return touch({ ...state, tasks });
}

export function moveTaskToCategory(state: FocusState, taskId: string, categoryId: string): FocusState {
  const now = nowIso();
  const sortOrder = nextTaskSortOrder(state, categoryId);
  const tasks = state.tasks.map((t) =>
    t.id === taskId
      ? {
          ...t,
          categoryId,
          sortOrder,
          // mover de categoría invalida selección actual si existe
          selectedAt: null,
          completedAt: t.status === "DONE" ? t.completedAt ?? now : null
        }
      : t
  );

  // quitar de selecciones existentes
  const selections = state.selections.filter((s) => s.taskId !== taskId);

  return touch({ ...state, tasks, selections });
}

export function toggleTaskDone(state: FocusState, taskId: string): FocusState {
  const now = nowIso();
  const tasks = state.tasks.map((t) => {
    if (t.id !== taskId) return t;
    const next: TaskStatus = t.status === "DONE" ? "PENDING" : "DONE";
    return {
      ...t,
      status: next,
      completedAt: next === "DONE" ? now : null
    };
  });

  const selections = state.selections.map((s) => {
    if (s.taskId !== taskId) return s;
    const task = tasks.find((t) => t.id === taskId);
    return { ...s, doneAt: task?.status === "DONE" ? now : null };
  });

  return touch({ ...state, tasks, selections });
}

export function getActiveBlock(state: FocusState) {
  return [...state.blocks].reverse().find((b) => b.status === "ACTIVE") ?? null;
}

export function getDraftBlockForCategory(state: FocusState, categoryId: string) {
  return [...state.blocks]
    .reverse()
    .find((b) => b.status === "DRAFT" && b.categoryId === categoryId) ?? null;
}

export function ensureDraftBlock(state: FocusState, categoryId: string): FocusState {
  if (getActiveBlock(state)) return state;

  const draft = getDraftBlockForCategory(state, categoryId);
  if (draft) return state;

  const cat = state.categories.find((c) => c.id === categoryId);
  const plannedSeconds = cat?.defaultSeconds ?? DEFAULT_SECONDS;

  const blockId = cuidLike();
  const block = {
    id: blockId,
    categoryId,
    status: "DRAFT" as const,
    plannedSeconds,
    actualSeconds: null,
    startedAt: null,
    endedAt: null,
    endReason: null,
    allSelectedCompleted: false
  };

  // auto-preselect: 1 tarea prioridad 1 si existe, para reducir fricción
  const pending = getPendingTasksForCategory(state, categoryId);
  const critical = pending.find((t) => t.priority === 1);
  const selections = critical
    ? [
        {
          id: cuidLike(),
          blockId,
          taskId: critical.id,
          sortOrder: 0,
          doneAt: null
        }
      ]
    : [];

  const tasks = state.tasks.map((t) => (critical && t.id === critical.id ? { ...t, selectedAt: nowIso() } : t));

  return touch({
    ...state,
    tasks,
    blocks: [...state.blocks, block],
    selections: [...state.selections, ...selections]
  });
}

export function setDraftPlannedSeconds(state: FocusState, categoryId: string, seconds: number): FocusState {
  const safe = Math.max(5 * 60, Math.min(4 * 60 * 60, Math.floor(seconds)));
  const draft = getDraftBlockForCategory(state, categoryId);
  if (!draft) return state;

  const blocks = state.blocks.map((b) => (b.id === draft.id ? { ...b, plannedSeconds: safe } : b));
  return touch({ ...state, blocks });
}

function nextSelectionOrder(state: FocusState, blockId: string) {
  const existing = state.selections.filter((s) => s.blockId === blockId);
  return existing.length ? Math.max(...existing.map((s) => s.sortOrder)) + 1 : 0;
}

export function isTaskSelectedInBlock(state: FocusState, blockId: string, taskId: string) {
  return state.selections.some((s) => s.blockId === blockId && s.taskId === taskId);
}

export function addTaskToBlock(state: FocusState, blockId: string, taskId: string): FocusState {
  if (isTaskSelectedInBlock(state, blockId, taskId)) return state;
  const now = nowIso();
  const order = nextSelectionOrder(state, blockId);

  const selections = [
    ...state.selections,
    {
      id: cuidLike(),
      blockId,
      taskId,
      sortOrder: order,
      doneAt: null
    }
  ];

  const tasks = state.tasks.map((t) => (t.id === taskId ? { ...t, selectedAt: t.selectedAt ?? now } : t));

  return touch({ ...state, tasks, selections });
}

export function removeTaskFromBlock(state: FocusState, blockId: string, taskId: string): FocusState {
  const selections = state.selections.filter((s) => !(s.blockId === blockId && s.taskId === taskId));
  // normalizamos sortOrder del bloque
  const re = selections
    .filter((s) => s.blockId === blockId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s, idx) => ({ ...s, sortOrder: idx }));

  const others = selections.filter((s) => s.blockId !== blockId);
  return touch({ ...state, selections: [...others, ...re] });
}

export function reorderBlockTasks(state: FocusState, blockId: string, orderedTaskIds: string[]): FocusState {
  const inBlock = state.selections.filter((s) => s.blockId === blockId);
  const map = new Map(inBlock.map((s) => [s.taskId, s]));

  const reordered = orderedTaskIds
    .map((taskId, idx) => {
      const s = map.get(taskId);
      return s ? { ...s, sortOrder: idx } : null;
    })
    .filter(Boolean) as typeof inBlock;

  // keep any that weren't included (safety)
  const rest = inBlock.filter((s) => !orderedTaskIds.includes(s.taskId)).map((s) => ({ ...s, sortOrder: reordered.length }));

  const others = state.selections.filter((s) => s.blockId !== blockId);
  return touch({ ...state, selections: [...others, ...reordered, ...rest] });
}

export function getBlockSelections(state: FocusState, blockId: string) {
  return state.selections
    .filter((s) => s.blockId === blockId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSelectedTasks(state: FocusState, blockId: string) {
  const selections = getBlockSelections(state, blockId);
  const byId = new Map(state.tasks.map((t) => [t.id, t]));
  return selections
    .map((s) => ({ selection: s, task: byId.get(s.taskId) }))
    .filter((x): x is { selection: any; task: any } => !!x.task);
}

export function getNextPendingSelection(state: FocusState, blockId: string) {
  const selected = getSelectedTasks(state, blockId);
  const next = selected.find((x) => x.task.status !== "DONE");
  return next?.task?.id ?? null;
}

export function getPendingTasksForCategory(state: FocusState, categoryId: string): Task[] {
  return state.tasks
    .filter((t) => t.categoryId === categoryId && t.status === "PENDING")
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.sortOrder - b.sortOrder;
    });
}

export function startBlock(state: FocusState, categoryId: string): FocusState {
  const now = nowIso();
  const draft = getDraftBlockForCategory(state, categoryId);
  if (!draft) return state;

  // si no hay tareas seleccionadas, auto-pick hasta 5
  const selected = getBlockSelections(state, draft.id);
  let nextState = state;
  if (selected.length === 0) {
    const pending = getPendingTasksForCategory(state, categoryId).slice(0, 5);
    for (const t of pending) nextState = addTaskToBlock(nextState, draft.id, t.id);
  }

  const blocks = nextState.blocks.map((b) =>
    b.id === draft.id
      ? ({
          ...b,
          status: "ACTIVE" as const,
          startedAt: now,
          endedAt: null,
          actualSeconds: null,
          endReason: null,
          allSelectedCompleted: false
        } as any)
      : b
  );

  return touch({ ...nextState, blocks });
}

export function endBlock(state: FocusState, blockId: string, actualSeconds: number): FocusState {
  const now = nowIso();
  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) return state;

  const blockSelections = getBlockSelections(state, blockId);
  const allDone = blockSelections.length > 0 && blockSelections.every((s) => !!s.doneAt);

  const blocks = state.blocks.map((b) =>
    b.id === blockId
      ? {
          ...b,
          status: "COMPLETED" as const,
          actualSeconds,
          endedAt: now,
          allSelectedCompleted: allDone
        }
      : b
  );

  return touch({ ...state, blocks });
}

export function interruptBlock(state: FocusState, blockId: string, actualSeconds: number, reason: string): FocusState {
  const now = nowIso();
  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) return state;

  const blocks = state.blocks.map((b) =>
    b.id === blockId
      ? {
          ...b,
          status: "INTERRUPTED" as const,
          actualSeconds,
          endedAt: now,
          endReason: reason.slice(0, 240) || "Interrumpido"
        }
      : b
  );

  return touch({ ...state, blocks });
}

export function getEditableBlockId(state: FocusState, categoryId: string): string | null {
  const active = getActiveBlock(state);
  if (active) return active.id;
  const draft = getDraftBlockForCategory(state, categoryId);
  return draft?.id ?? null;
}

export function getBlockById(state: FocusState, blockId: string) {
  return state.blocks.find((b) => b.id === blockId) ?? null;
}

export function getCategoryById(state: FocusState, categoryId: string) {
  return state.categories.find((c) => c.id === categoryId) ?? null;
}