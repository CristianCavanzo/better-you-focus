import { FocusState, TaskStatus } from '@/src/types/focus';
import { cuidLike, nowIso } from '@/src/lib/ids';

export const DEFAULT_CATEGORIES = [
    { id: 'work', name: 'Trabajo', sortOrder: 0, defaultSeconds: 25 * 60 },
    { id: 'study', name: 'Estudio', sortOrder: 1, defaultSeconds: 25 * 60 },
    { id: 'gym', name: 'Gym', sortOrder: 2, defaultSeconds: 25 * 60 },
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
                id: 't1',
                categoryId: 'work',
                title: 'Abrir repo y elegir 1 tarea',
                status: 'PENDING',
                priority: 2,
                sortOrder: 0,
            },
            {
                id: 't2',
                categoryId: 'work',
                title: 'Implementar 1 cambio pequeño',
                status: 'PENDING',
                priority: 2,
                sortOrder: 1,
            },
            {
                id: 't3',
                categoryId: 'study',
                title: 'Leer 10 min (1 tema)',
                status: 'PENDING',
                priority: 2,
                sortOrder: 0,
            },
            {
                id: 't4',
                categoryId: 'gym',
                title: 'Calentamiento 5 min',
                status: 'PENDING',
                priority: 2,
                sortOrder: 0,
            },
        ],
        blocks: [],
        selections: [],
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
            { id, name: name.trim() || 'Nueva categoría', sortOrder, defaultSeconds: 25 * 60 },
        ],
    });
}

export function setCategoryDefaultSeconds(
    state: FocusState,
    categoryId: string,
    seconds: number,
): FocusState {
    const safe = Number.isFinite(seconds) ? Math.max(60, Math.min(6 * 60 * 60, seconds)) : 25 * 60;
    return touch({
        ...state,
        categories: state.categories.map((c) =>
            c.id === categoryId ? { ...c, defaultSeconds: safe } : c,
        ),
    });
}

export function addTask(
    state: FocusState,
    categoryId: string,
    title: string,
): FocusState {
    return addTaskWithId(state, categoryId, title).state;
}

export function addTaskWithId(
    state: FocusState,
    categoryId: string,
    title: string,
): { state: FocusState; taskId: string } {
    const id = cuidLike();
    const existing = state.tasks.filter((t) => t.categoryId === categoryId);
    const sortOrder = existing.length
        ? Math.max(...existing.map((t) => t.sortOrder)) + 1
        : 0;
    const next = touch({
        ...state,
        tasks: [
            ...state.tasks,
            {
                id,
                categoryId,
                title: title.trim() || 'Nueva tarea',
                status: 'PENDING',
                priority: 2,
                sortOrder,
            },
        ],
    });
    return { state: next, taskId: id };
}

export function setTaskPriority(
    state: FocusState,
    taskId: string,
    priority: number,
): FocusState {
    const p = Number.isFinite(priority) ? Math.max(1, Math.min(4, Math.round(priority))) : 2;
    return touch({
        ...state,
        tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, priority: p } : t)),
    });
}

export function addTaskToBlock(state: FocusState, blockId: string, taskId: string): FocusState {
    const block = state.blocks.find((b) => b.id === blockId);
    const task = state.tasks.find((t) => t.id === taskId);
    if (!block || !task) return state;
    if (task.categoryId !== block.categoryId) return state;
    if (state.selections.some((s) => s.blockId === blockId && s.taskId === taskId)) return state;

    const blockSelections = state.selections
        .filter((s) => s.blockId === blockId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    const nextOrder = blockSelections.length
        ? Math.max(...blockSelections.map((s) => s.sortOrder)) + 1
        : 0;

    const now = nowIso();
    const selections = [
        ...state.selections,
        {
            id: cuidLike(),
            blockId,
            taskId,
            sortOrder: nextOrder,
            doneAt: null,
        },
    ];

    // marca selectedAt para que quede evidencia de “entró al bloque”
    const tasks = state.tasks.map((t) => (t.id === taskId ? { ...t, selectedAt: now } : t));

    return touch({ ...state, tasks, selections });
}

export function toggleTaskDone(state: FocusState, taskId: string): FocusState {
    const now = nowIso();
    const tasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const next: TaskStatus = t.status === 'DONE' ? 'PENDING' : 'DONE';
        return {
            ...t,
            status: next,
            completedAt: next === 'DONE' ? now : null,
        };
    });

    const selections = state.selections.map((s) => {
        if (s.taskId !== taskId) return s;
        // si se marca DONE, pon doneAt en TODAS las selecciones activas (o la más reciente)
        // aquí: marcamos doneAt para cualquier selección no terminada de ese task
        const task = tasks.find((t) => t.id === taskId);
        return { ...s, doneAt: task?.status === 'DONE' ? now : null };
    });

    return touch({ ...state, tasks, selections });
}

export function startBlock(
    state: FocusState,
    categoryId: string,
    plannedSeconds: number,
    pickCount = 5,
    selectedTaskIds?: string[],
) {
    const now = nowIso();
    const blockId = cuidLike();

    const byId = new Map(state.tasks.map((t) => [t.id, t]));

    // Si el usuario seleccionó manualmente tareas para el bloque, respetamos eso.
    const manual = (selectedTaskIds ?? [])
        .map((id) => byId.get(id))
        .filter(
            (t): t is NonNullable<typeof t> =>
                !!t && t.categoryId === categoryId && t.status === 'PENDING',
        )
        .slice(0, pickCount);

    // Fallback: auto-pick por prioridad y luego orden.
    const pending = manual.length
        ? manual
        : state.tasks
              .filter((t) => t.categoryId === categoryId && t.status === 'PENDING')
              .sort(
                  (a, b) =>
                      ((a.priority ?? 2) - (b.priority ?? 2)) ||
                      (a.sortOrder - b.sortOrder),
              )
              .slice(0, pickCount);

    const block = {
        id: blockId,
        categoryId,
        status: 'ACTIVE' as const,
        plannedSeconds,
        actualSeconds: null,
        startedAt: now,
        endedAt: null,
        endReason: null,
        allSelectedCompleted: false,
    };

    const selections = pending.map((t, idx) => ({
        id: cuidLike(),
        blockId,
        taskId: t.id,
        sortOrder: idx,
        doneAt: null,
    }));

    const tasks = state.tasks.map((t) =>
        pending.some((p) => p.id === t.id) ? { ...t, selectedAt: now } : t,
    );

    return touch({
        ...state,
        tasks,
        blocks: [...state.blocks, block],
        selections: [...state.selections, ...selections],
    });
}

export function endBlock(
    state: FocusState,
    blockId: string,
    actualSeconds: number,
    opts?: { status?: 'COMPLETED' | 'INTERRUPTED'; endReason?: string | null },
) {
    const now = nowIso();
    const block = state.blocks.find((b) => b.id === blockId);
    if (!block) return state;

    const blockSelections = state.selections
        .filter((s) => s.blockId === blockId)
        .sort((a, b) => a.sortOrder - b.sortOrder);

    const allDone =
        blockSelections.length > 0 && blockSelections.every((s) => !!s.doneAt);

    const nextStatus = (opts?.status ?? 'COMPLETED') as 'COMPLETED' | 'INTERRUPTED';
    const rawEndReason = opts?.endReason ?? null;
    const endReason = rawEndReason != null ? String(rawEndReason).slice(0, 140) : null;

    const blocks = state.blocks.map((b) =>
        b.id === blockId
            ? {
                  ...b,
                  status: nextStatus,
                  actualSeconds,
                  endedAt: now,
                  endReason,
                  allSelectedCompleted: allDone,
              }
            : b,
    );

    return touch({ ...state, blocks });
}

export function getActiveBlock(state: FocusState) {
    return (
        [...state.blocks].reverse().find((b) => b.status === 'ACTIVE') ?? null
    );
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
    const next = selected.find((x) => x.task.status !== 'DONE');
    return next?.task?.id ?? null;
}
