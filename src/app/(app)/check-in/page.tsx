import { Topbar } from '@/src/components/shell/Topbar';
import { getUserIdOrThrow } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';

function todayKeyBogota() {
    // en-CA -> YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

const MOODS = [
    'calma',
    'ansiedad',
    'aburrimiento',
    'frustración',
    'motivación',
    'cansancio',
] as const;
const GOALS = [25, 50, 75, 100, 120] as const;

function recommend(urge?: number | null, energy?: number | null) {
    const u = typeof urge === 'number' ? urge : null;
    const e = typeof energy === 'number' ? energy : null;
    // heurística simple: urge alto o energía baja => bloque corto y WIP bajo
    const short = (u != null && u >= 7) || (e != null && e <= 4);
    return {
        blockMin: short ? 15 : 25,
        wip: short ? 1 : 3,
        note: short
            ? 'Hoy estás vulnerable. Bloques cortos + 1 tarea. Cero negociación.'
            : 'Bloque estándar (25m) y 2–3 tareas.',
    };
}

export default async function CheckInPage() {
    const userId = getUserIdOrThrow();
    const dateKey = todayKeyBogota();

    const [existing, categories] = await Promise.all([
        prisma.dailyLog.findUnique({
            where: { userId_dateKey: { userId, dateKey } },
        }),
        prisma.category.findMany({
            where: { userId },
            orderBy: { sortOrder: 'asc' },
        }),
    ]);

    const rec = recommend(existing?.urge ?? null, existing?.energy ?? null);

    async function save(formData: FormData) {
        'use server';
        const userId = getUserIdOrThrow();
        const dateKey = todayKeyBogota();

        const urge = Number(formData.get('urge') ?? '');
        const energy = Number(formData.get('energy') ?? '');
        const mood = String(formData.get('mood') ?? '').slice(0, 32);
        const minutesGoal = Number(formData.get('minutesGoal') ?? '');

        const criticalTask = String(formData.get('criticalTask') ?? '')
            .slice(0, 140)
            .trim();
        const criticalCategoryId =
            String(formData.get('criticalCategoryId') ?? '').trim() || null;
        const criticalDueTime = String(
            formData.get('criticalDueTime') ?? '',
        ).trim();
        const criticalEstimate = Number(formData.get('criticalEstimate') ?? '');

        const ifThen = String(formData.get('ifThen') ?? '')
            .slice(0, 180)
            .trim();
        const emotion = String(formData.get('emotion') ?? '')
            .slice(0, 64)
            .trim();
        const nextStep = String(formData.get('nextStep') ?? '')
            .slice(0, 140)
            .trim();
        const valueActionDone = formData.get('valueActionDone') === 'on';

        const log = await prisma.dailyLog.upsert({
            where: { userId_dateKey: { userId, dateKey } },
            update: {
                urge: Number.isFinite(urge) ? urge : null,
                energy: Number.isFinite(energy) ? energy : null,
                mood: mood || null,
                minutesGoal: Number.isFinite(minutesGoal) ? minutesGoal : null,
                criticalTask: criticalTask || null,
                criticalCategoryId,
                ifThen: ifThen || null,
                emotion: emotion || null,
                nextStep: nextStep || null,
                valueActionDone,
            },
            create: {
                userId,
                dateKey,
                urge: Number.isFinite(urge) ? urge : null,
                energy: Number.isFinite(energy) ? energy : null,
                mood: mood || null,
                minutesGoal: Number.isFinite(minutesGoal) ? minutesGoal : null,
                criticalTask: criticalTask || null,
                criticalCategoryId,
                ifThen: ifThen || null,
                emotion: emotion || null,
                nextStep: nextStep || null,
                valueActionDone,
            },
        });

        // Si definiste una "tarea crítica", la materializamos como Task real (prioridad Alta)
        if (criticalTask) {
            const dueAt = (() => {
                if (!criticalDueTime) return null;
                // dateKey es YYYY-MM-DD en Bogota
                const iso = new Date(
                    `${dateKey}T${criticalDueTime}:00`,
                ).toISOString();
                return new Date(iso);
            })();

            const existingCritical = await prisma.task.findFirst({
                where: { userId, dailyLogId: log.id },
            });

            if (existingCritical) {
                await prisma.task.update({
                    where: { id: existingCritical.id },
                    data: {
                        title: criticalTask,
                        categoryId:
                            criticalCategoryId ?? existingCritical.categoryId,
                        priority: 1,
                        status: 'PENDING',
                        sortOrder: Math.min(existingCritical.sortOrder, -100),
                        dueAt,
                        estimateMinutes: Number.isFinite(criticalEstimate)
                            ? criticalEstimate
                            : null,
                    },
                });
            } else if (criticalCategoryId) {
                await prisma.task.create({
                    data: {
                        userId,
                        categoryId: criticalCategoryId,
                        title: criticalTask,
                        priority: 1,
                        status: 'PENDING',
                        sortOrder: -100,
                        dailyLogId: log.id,
                        dueAt,
                        estimateMinutes: Number.isFinite(criticalEstimate)
                            ? criticalEstimate
                            : null,
                    },
                });
            }
        }

        // Empuja la marca de agua para que Focus hydrate traiga cambios del server
        await prisma.user.update({
            where: { id: userId },
            data: { lastStateAt: new Date() },
        });
    }

    return (
        <div className="space-y-6">
            <Topbar title="Check-in (2 min)" />

            <div className="rounded-3xl border border-white/10 bg-surface2/50 p-5">
                <div className="text-sm font-semibold">Dirección del día</div>
                <div className="mt-1 text-xs text-muted">
                    Úsalo así (2 min): 1) mide tu estado, 2) define la tarea
                    crítica, 3) escribe tu plan “si X → haré Y”. Esto alimenta
                    tu Focus: duración sugerida y cuántas tareas debes meter por
                    bloque.
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-sm font-semibold">
                        Recomendación automática (hoy)
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                        Bloque:{' '}
                        <span className="text-white/80">
                            {rec.blockMin} min
                        </span>{' '}
                        · WIP:{' '}
                        <span className="text-white/80">
                            {rec.wip} tarea(s)
                        </span>
                    </div>
                    <div className="mt-1 text-xs text-white/55">{rec.note}</div>
                </div>

                <form
                    action={save}
                    className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    <label className="space-y-2">
                        <div className="text-xs text-muted">Urge (0–10)</div>
                        <input
                            name="urge"
                            type="number"
                            min={0}
                            max={10}
                            defaultValue={existing?.urge ?? ''}
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                    </label>

                    <label className="space-y-2">
                        <div className="text-xs text-muted">Energía (0–10)</div>
                        <input
                            name="energy"
                            type="number"
                            min={0}
                            max={10}
                            defaultValue={existing?.energy ?? ''}
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                    </label>

                    <label className="space-y-2">
                        <div className="text-xs text-muted">Mood (rápido)</div>
                        <select
                            name="mood"
                            defaultValue={existing?.mood ?? ''}
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        >
                            <option value="">(sin seleccionar)</option>
                            {MOODS.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2">
                        <div className="text-xs text-muted">
                            Meta de minutos Focus (hoy)
                        </div>
                        <select
                            name="minutesGoal"
                            defaultValue={existing?.minutesGoal ?? ''}
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        >
                            <option value="">(sin meta)</option>
                            {GOALS.map((g) => (
                                <option key={g} value={g}>
                                    {g} min
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2 md:col-span-2">
                        <div className="text-xs text-muted">
                            Tarea crítica (si solo haces 1 cosa hoy)
                        </div>
                        <input
                            name="criticalTask"
                            defaultValue={existing?.criticalTask ?? ''}
                            placeholder='Ej: "Entregar PR de X"'
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                        <div className="text-xs text-muted">
                            Grupo para la tarea crítica
                        </div>
                        <select
                            name="criticalCategoryId"
                            defaultValue={existing?.criticalCategoryId ?? ''}
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        >
                            <option value="">(sin grupo)</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <div className="mt-1 text-xs text-muted">
                            Si eliges grupo, se crea/actualiza una Task real con
                            prioridad Alta.
                        </div>
                    </label>

                    <label className="space-y-2">
                        <div className="text-xs text-muted">
                            Hora límite (tarea crítica)
                        </div>
                        <input
                            name="criticalDueTime"
                            type="time"
                            defaultValue={''}
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                        <div className="mt-1 text-[11px] text-white/45">
                            Opcional. Si lo pones, se programa “para hoy antes
                            de esa hora”.
                        </div>
                    </label>

                    <label className="space-y-2">
                        <div className="text-xs text-muted">
                            Estimación (min)
                        </div>
                        <input
                            name="criticalEstimate"
                            type="number"
                            min={1}
                            max={480}
                            defaultValue={''}
                            placeholder="Ej: 45"
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                        <div className="text-xs text-muted">
                            Plan anti-recaída (Implementation Intention)
                        </div>
                        <input
                            name="ifThen"
                            defaultValue={existing?.ifThen ?? ''}
                            placeholder='Ej: "Si siento urge de scroll, entonces respiro 30s y abro la siguiente task"'
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                        <div className="mt-1 text-[11px] text-white/45">
                            Hazlo específico: “Si X (trigger) → entonces Y
                            (acción de 2 min)”.
                        </div>
                    </label>

                    <label className="space-y-2">
                        <div className="text-xs text-muted">
                            Emoción dominante (texto)
                        </div>
                        <input
                            name="emotion"
                            defaultValue={existing?.emotion ?? ''}
                            placeholder="Ej: ansiedad / aburrimiento"
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                    </label>

                    <label className="space-y-2">
                        <div className="text-xs text-muted">
                            Siguiente paso (pre-escrito)
                        </div>
                        <input
                            name="nextStep"
                            defaultValue={existing?.nextStep ?? ''}
                            placeholder="Ej: abrir PR y escribir 1 comentario"
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                    </label>

                    <label className="flex items-center gap-3 md:col-span-2">
                        <input
                            name="valueActionDone"
                            type="checkbox"
                            defaultChecked={existing?.valueActionDone ?? false}
                            className="h-4 w-4"
                        />
                        <span className="text-sm">
                            Hice 1 acción de valor hoy
                        </span>
                    </label>

                    <div className="md:col-span-2 flex items-center gap-3">
                        <button className="rounded-2xl border border-white/10 bg-accent/15 px-4 py-2 text-sm hover:bg-accent/20">
                            Guardar
                        </button>
                        <div className="text-xs text-muted">
                            {existing
                                ? 'Ya tienes check-in hoy (se actualiza).'
                                : 'Aún no hay check-in hoy.'}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
