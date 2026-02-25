import { Topbar } from '@/src/components/shell/Topbar';
import { getUserIdOrThrow } from '@/src/lib/auth';
import { prisma } from '@/src/lib/prisma';

function todayKeyBogota() {
    // en-CA => YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

const MOODS = [
    'Enfocado',
    'Calmado',
    'Ansioso',
    'Aburrido',
    'Frustrado',
    'Cansado',
    'Motivado',
] as const;

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

    async function save(formData: FormData) {
        'use server';

        const userId = getUserIdOrThrow();
        const dateKey = todayKeyBogota();

        const urge = Number(formData.get('urge') ?? '');
        const energy = Number(formData.get('energy') ?? '');
        const mood = String(formData.get('mood') ?? '').slice(0, 24);
        const minutesGoal = Number(formData.get('minutesGoal') ?? '');

        const emotion = String(formData.get('emotion') ?? '').slice(0, 64);
        const criticalTask = String(formData.get('criticalTask') ?? '').slice(
            0,
            120,
        );
        const criticalCategoryId = String(
            formData.get('criticalCategoryId') ?? '',
        ).slice(0, 80);

        const ifThen = String(formData.get('ifThen') ?? '').slice(0, 220);
        const nextStep = String(formData.get('nextStep') ?? '').slice(0, 140);
        const valueActionDone = formData.get('valueActionDone') === 'on';

        const log = await prisma.dailyLog.upsert({
            where: { userId_dateKey: { userId, dateKey } },
            update: {
                urge: Number.isFinite(urge) ? urge : null,
                energy: Number.isFinite(energy) ? energy : null,
                mood: mood || null,
                minutesGoal: Number.isFinite(minutesGoal) ? minutesGoal : null,
                emotion: emotion || null,
                ifThen: ifThen || null,
                criticalTask: criticalTask || null,
                criticalCategoryId: criticalCategoryId || null,
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
                emotion: emotion || null,
                ifThen: ifThen || null,
                criticalTask: criticalTask || null,
                criticalCategoryId: criticalCategoryId || null,
                nextStep: nextStep || null,
                valueActionDone,
            },
        });

        // Si hay tarea crítica, créala/actualízala en backlog con prioridad alta.
        const ct = criticalTask.trim();
        const cc = criticalCategoryId.trim();
        if (ct && cc) {
            const existingTask = await prisma.task.findFirst({
                where: { userId, dailyLogId: log.id },
            });

            if (existingTask) {
                await prisma.task.update({
                    where: { id: existingTask.id },
                    data: {
                        title: ct,
                        categoryId: cc,
                        priority: 1,
                        status: 'PENDING',
                    },
                });
            } else {
                const max = await prisma.task.aggregate({
                    where: { userId, categoryId: cc },
                    _max: { sortOrder: true },
                });
                const sortOrder = (max._max.sortOrder ?? 0) + 1;

                await prisma.task.create({
                    data: {
                        userId,
                        categoryId: cc,
                        title: ct,
                        priority: 1,
                        status: 'PENDING',
                        sortOrder,
                        dailyLogId: log.id,
                    },
                });
            }
        }
    }

    return (
        <div className="space-y-6">
            <Topbar title="Check-in (2 min)" />

            <div className="rounded-3xl border border-white/10 bg-surface2/50 p-5">
                <div className="text-sm font-semibold">Dirección del día</div>
                <div className="mt-1 text-xs text-muted">
                    Estado → 1 cosa crítica → plan anti-recaída (si X → Y). Esto
                    alimenta tu Focus.
                </div>

                <form
                    action={save}
                    className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
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
                        <div className="text-xs text-muted">Mood</div>
                        <select
                            name="mood"
                            defaultValue={existing?.mood ?? ''}
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        >
                            <option value="">Selecciona…</option>
                            {MOODS.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-2">
                        <div className="text-xs text-muted">
                            Meta de Focus (min)
                        </div>
                        <input
                            name="minutesGoal"
                            type="number"
                            min={5}
                            max={600}
                            defaultValue={existing?.minutesGoal ?? ''}
                            placeholder="Ej: 75"
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                        <div className="text-xs text-muted">
                            Emoción dominante (opcional)
                        </div>
                        <input
                            name="emotion"
                            defaultValue={existing?.emotion ?? ''}
                            placeholder="Ej: ansiedad / aburrimiento / frustración"
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                    </label>

                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                        <label className="space-y-2">
                            <div className="text-xs text-muted">
                                1 cosa crítica del día
                            </div>
                            <input
                                name="criticalTask"
                                defaultValue={existing?.criticalTask ?? ''}
                                placeholder="Ej: terminar DTO + tests"
                                className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                            />
                            <div className="text-[11px] text-white/55">
                                Si lo llenas + eliges grupo, se crea una task
                                con prioridad alta automáticamente.
                            </div>
                        </label>

                        <label className="space-y-2">
                            <div className="text-xs text-muted">Grupo</div>
                            <select
                                name="criticalCategoryId"
                                defaultValue={
                                    existing?.criticalCategoryId ?? ''
                                }
                                className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                            >
                                <option value="">Selecciona…</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="space-y-2 md:col-span-2">
                        <div className="text-xs text-muted">
                            Plan anti-recaída (Implementation intention)
                        </div>
                        <input
                            name="ifThen"
                            defaultValue={existing?.ifThen ?? ''}
                            placeholder='Ej: "Si me da urge de jugar → respiro 30s y abro la tarea crítica"'
                            className="w-full rounded-2xl bg-black/20 border border-white/10 px-3 py-2 text-sm"
                        />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                        <div className="text-xs text-muted">
                            Siguiente paso (literal, 2 minutos)
                        </div>
                        <input
                            name="nextStep"
                            defaultValue={existing?.nextStep ?? ''}
                            placeholder="Ej: abrir repo, crear rama, editar 1 archivo"
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
                                ? 'Ya tienes un check-in hoy (se actualiza).'
                                : 'Aún no hay check-in hoy.'}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
