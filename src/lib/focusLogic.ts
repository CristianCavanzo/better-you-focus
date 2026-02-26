import { BlockStatus, FocusState, RepeatCadence, TaskStatus } from "@/src/types/focus";
import { cuidLike, nowIso } from "@/src/lib/ids";

export const DEFAULT_CATEGORIES = [
  { id: "work", name: "Trabajo", sortOrder: 0, defaultSeconds: 25 * 60 },
  { id: "study", name: "Estudio", sortOrder: 1, defaultSeconds: 25 * 60 },
  { id: "gym", name: "Gym", sortOrder: 2, defaultSeconds: 25 * 60 }
];

export function makeInitialState(): FocusState {
  const now = nowIso();
  return {
    version: 1,
    lastLocalEditAt: now,
    categories: DEFAULT_CATEGORIES,
    tasks: [
      // demo tasks
      {
        id: "t1",
        categoryId: "work",
        title: "Abrir repo y elegir 1 tarea",
        notes: null,
        priority: 1,
        dueAt: null,
        estimateMinutes: 5,
        repeatCadence: "NONE",
        repeatTime: null,
        status: "PENDING",
        sortOrder: 0
      },
      {
        id: "t2",
        categoryId: "work",
        title: "Implementar 1 cambio pequeño",
        notes: null,
        priority: 2,
        dueAt: null,
        estimateMinutes: 25,
        repeatCadence: "NONE",
        repeatTime: null,
        status: "PENDING",
        sortOrder: 1
      },
      {
        id: "t3",
        categoryId: "study",
        title: "Leer 15 min (repetida)",
        notes: null,
        priority: 2,
        dueAt: null,
        estimateMinutes: 15,
        repeatCadence: "WEEKDAYS",
        repeatTime: "08:00",
        status: "PENDING",
        sortOrder: 0
      },
      {
        id: "t4",
        categoryId: "gym",
        title: "Calentamiento 5 min",
        notes: null,
        priority: 3,
        dueAt: null,
        estimateMinutes: 5,
        repeatCadence: "NONE",
        repeatTime: null,
        status: "PENDING",
        sortOrder: 0
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
        defaultSeconds: 25 * 60
      }
    ]
  });
}

export function updateCategoryDefaultSeconds(
  state: FocusState,
  categoryId: string,
  defaultSeconds: number
): FocusState {
  const next = state.categories.map((c) =>
    c.id === categoryId ? { ...c, defaultSeconds: clamp(defaultSeconds, 60, 4 * 60 * 60) } : c
  );
  return touch({ ...state, categories: next });
}

export function addTask(
  state: FocusState,
  categoryId: string,
  title: string,
  opts?: {
    priority?: number;
    notes?: string | null;
    dueAt?: string | null;
    estimateMinutes?: number | null;
    repeatCadence?: RepeatCadence;
    repeatTime?: string | null;
    addToCurrentBlock?: boolean;
    blockId?: string | null;
  }
): FocusState {
  const id = cuidLike();
  const existing = state.tasks.filter((t) => t.categoryId === categoryId);
  const sortOrder = existing.length ? Math.max(...existing.map((t) => t.sortOrder)) + 1 : 0;

  const task = {
    id,
    categoryId,
    title: title.trim() || "Nueva tarea",
    notes: opts?.notes ?? null,
    priority: clampInt(opts?.priority ?? 2, 1, 4),
    dueAt: opts?.dueAt ?? null,
    estimateMinutes: opts?.estimateMinutes ?? null,
    repeatCadence: (opts?.repeatCadence ?? "NONE") as RepeatCadence,
    repeatTime: opts?.repeatTime ?? null,
    status: "PENDING" as const,
    sortOrder
  };

  let nextState = touch({ ...state, tasks: [...state.tasks, task] });

  const blockId = opts?.blockId ?? null;
  if (opts?.addToCurrentBlock && blockId) {
    nextState = addTaskToBlock(nextState, blockId, id);
  }

  return nextState;
}

export function updateTaskPriority(state: FocusState, taskId: string, priority: number): FocusState {
  const p = clampInt(priority, 1, 4);
  const tasks = state.tasks.map((t) => (t.id === taskId ? { ...t, priority: p } : t));
  return touch({ ...state, tasks });
}

export function updateTaskDueAt(state: FocusState, taskId: string, dueAt: string | null): FocusState {
  const tasks = state.tasks.map((t) => (t.id === taskId ? { ...t, dueAt } : t));
  return touch({ ...state, tasks });
}

export function updateTaskEstimate(state: FocusState, taskId: string, estimateMinutes: number | null): FocusState {
  const v = estimateMinutes == null ? null : clampInt(estimateMinutes, 1, 8 * 60);
  const tasks = state.tasks.map((t) => (t.id === taskId ? { ...t, estimateMinutes: v } : t));
  return touch({ ...state, tasks });
}

export function updateTaskRepeat(
  state: FocusState,
  taskId: string,
  repeatCadence: RepeatCadence,
  repeatTime?: string | null
): FocusState {
  const cad: RepeatCadence = (repeatCadence ?? "NONE") as RepeatCadence;
  const rt = cad === "NONE" ? null : (repeatTime ?? null);
  const tasks = state.tasks.map((t) =>
    t.id === taskId ? { ...t, repeatCadence: cad, repeatTime: rt } : t
  );
  return touch({ ...state, tasks });
}

export function updateTaskCategory(state: FocusState, taskId: string, categoryId: string): FocusState {
  const tasks = state.tasks.map((t) => (t.id === taskId ? { ...t, categoryId } : t));
  // Si una task cambia de categoría, la sacamos de cualquier bloque para no mezclar
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

export function getDraftBlock(state: FocusState, categoryId: string) {
  return (
    [...state.blocks]
      .reverse()
      .find((b) => b.status === "DRAFT" && b.categoryId === categoryId) ?? null
  );
}

export function ensureDraftBlock(state: FocusState, categoryId: string, plannedSeconds: number): FocusState {
  // no draft si ya hay un activo
  if (getActiveBlock(state)) return state;

  const draft = getDraftBlock(state, categoryId);
  if (draft) {
    if (draft.plannedSeconds === plannedSeconds) return state;
    return touch({
      ...state,
      blocks: state.blocks.map((b) =>
        b.id === draft.id ? { ...b, plannedSeconds: plannedSeconds } : b
      )
    });
  }

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

  return touch({ ...state, blocks: [...state.blocks, block] });
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
    .filter((x): x is { selection: any; task: any } => !!x.task)
    .sort((a, b) => compareTask(a.task, b.task) || (a.selection.sortOrder - b.selection.sortOrder));
}

export function getNextPendingSelection(state: FocusState, blockId: string) {
  const selected = getSelectedTasks(state, blockId);
  const next = selected.find((x) => x.task.status !== "DONE");
  return next?.task?.id ?? null;
}

export function isTaskInBlock(state: FocusState, blockId: string, taskId: string) {
  return state.selections.some((s) => s.blockId === blockId && s.taskId === taskId);
}

export function addTaskToBlock(state: FocusState, blockId: string, taskId: string): FocusState {
  if (isTaskInBlock(state, blockId, taskId)) return state;

  const current = getBlockSelections(state, blockId);
  const sortOrder = current.length ? Math.max(...current.map((s) => s.sortOrder)) + 1 : 0;

  const sel = {
    id: cuidLike(),
    blockId,
    taskId,
    sortOrder,
    doneAt: null
  };

  return touch({ ...state, selections: [...state.selections, sel] });
}

export function removeTaskFromBlock(state: FocusState, blockId: string, taskId: string): FocusState {
  const selections = state.selections.filter((s) => !(s.blockId === blockId && s.taskId === taskId));
  return touch({ ...state, selections });
}

export function toggleTaskInBlock(state: FocusState, blockId: string, taskId: string): FocusState {
  return isTaskInBlock(state, blockId, taskId)
    ? removeTaskFromBlock(state, blockId, taskId)
    : addTaskToBlock(state, blockId, taskId);
}

export function startBlock(
  state: FocusState,
  categoryId: string,
  plannedSeconds: number,
  pickCount = 5
): FocusState {
  const now = nowIso();
  // Ensure draft exists
  let next = ensureDraftBlock(state, categoryId, plannedSeconds);
  const draft = getDraftBlock(next, categoryId);
  if (!draft) return state;

  const blockId = draft.id;

  // If no selected tasks, auto pick
  const existingSelections = getBlockSelections(next, blockId);
  if (existingSelections.length === 0) {
    const pending = next.tasks
      .filter((t) => t.categoryId === categoryId && t.status === "PENDING")
      .sort(compareTask)
      .slice(0, pickCount);

    const newSelections = pending.map((t, idx) => ({
      id: cuidLike(),
      blockId,
      taskId: t.id,
      sortOrder: idx,
      doneAt: null
    }));

    const tasks = next.tasks.map((t) =>
      pending.some((p) => p.id === t.id) ? { ...t, selectedAt: now } : t
    );

    next = { ...next, tasks, selections: [...next.selections, ...newSelections] };
  }

  // Activate block
  next = {
    ...next,
    blocks: next.blocks.map((b) =>
      b.id === blockId
        ? ({
            ...b,
            status: "ACTIVE" as BlockStatus,
            plannedSeconds,
            startedAt: now,
            endedAt: null,
            endReason: null,
            actualSeconds: null
          } as any)
        : b
    )
  };

  return touch(next);
}

export function compareTask(a: any, b: any) {
  // 1) prioridad (1 alta)
  const p = (a.priority ?? 2) - (b.priority ?? 2);
  if (p !== 0) return p;

  // 2) dueAt (más cercano primero; null al final)
  const ad = a.dueAt ? Date.parse(a.dueAt) : Number.POSITIVE_INFINITY;
  const bd = b.dueAt ? Date.parse(b.dueAt) : Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad - bd;

  // 3) sortOrder estable
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
}

export function endBlock(
  state: FocusState,
  blockId: string,
  actualSeconds: number,
  opts?: { status?: Exclude<BlockStatus, "DRAFT">; reason?: string | null }
): FocusState {
  const now = nowIso();
  const block = state.blocks.find((b) => b.id === blockId);
  if (!block) return state;

  const blockSelections = getBlockSelections(state, blockId);
  const allDone = blockSelections.length > 0 && blockSelections.every((s) => !!s.doneAt);

  const status: BlockStatus = opts?.status ?? "COMPLETED";

  const blocks = state.blocks.map((b) =>
    b.id === blockId
      ? ({
          ...b,
          status,
          actualSeconds,
          endedAt: now,
          endReason: (opts?.reason ?? null) || null,
          allSelectedCompleted: allDone
        } as any)
      : b
  );

  return touch({ ...state, blocks });
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function clampInt(v: number, min: number, max: number) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return clamp(n, min, max);
}
