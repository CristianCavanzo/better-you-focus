import { Topbar } from '@/src/components/shell/Topbar';
import { getUserIdOrThrow } from '@/src/lib/auth';
import { getDashboardStats } from '@/src/lib/stats';
import { TradingLineChart } from '@/src/components/charts/TradingLineChart';
import { TradingHistogram } from '@/src/components/charts/TradingHistogram';
import { prisma } from '@/src/lib/prisma';

function todayKeyBogota() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

export default async function DashboardPage() {
    const userId = getUserIdOrThrow();
    const stats = await getDashboardStats(userId, 14);

    const dateKey = todayKeyBogota();
    const start = new Date(`${dateKey}T00:00:00-05:00`);
    const end = new Date(`${dateKey}T23:59:59-05:00`);

    const [todayLog, dueToday] = await Promise.all([
        prisma.dailyLog.findUnique({
            where: { userId_dateKey: { userId, dateKey } },
        }),
        prisma.task.findMany({
            where: {
                userId,
                status: 'PENDING',
                dueAt: { gte: start, lte: end },
            },
            orderBy: [{ priority: 'asc' }, { dueAt: 'asc' }],
            take: 6,
        }),
    ]);

    return (
        <div className="space-y-6">
            <Topbar title="Analytics" />

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
                    <div className="text-xs text-muted">Minutos (14d)</div>
                    <div className="mt-2 text-3xl font-semibold">
                        {Math.round(stats.totalMinutes)}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                        Tiempo real invertido en foco.
                    </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
                    <div className="text-xs text-muted">Racha</div>
                    <div className="mt-2 text-3xl font-semibold">
                        {stats.streak} días
                    </div>
                    <div className="mt-1 text-xs text-muted">
                        Días consecutivos con foco.
                    </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-surface2/50 p-4">
                    <div className="text-xs text-muted">Pánico (14d)</div>
                    <div className="mt-2 text-3xl font-semibold">
                        {stats.panicSeries.reduce((a, x) => a + x.value, 0)}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                        Veces que activaste intervención.
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-surface2/50 p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold">Hoy</div>
                        <div className="mt-1 text-xs text-muted">
                            Si no hay dirección, el cerebro elige dopamina
                            rápida. Hoy gana el plan.
                        </div>
                    </div>
                    <div className="text-xs text-white/55">{dateKey}</div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-sm font-semibold">Check-in</div>
                        <div className="mt-2 text-xs text-white/60">
                            {todayLog ? (
                                <>
                                    Urge:{' '}
                                    <span className="text-white/80">
                                        {todayLog.urge ?? '—'}
                                    </span>{' '}
                                    · Energía:{' '}
                                    <span className="text-white/80">
                                        {todayLog.energy ?? '—'}
                                    </span>{' '}
                                    · Meta:{' '}
                                    <span className="text-white/80">
                                        {todayLog.minutesGoal ?? '—'} min
                                    </span>
                                    {todayLog.ifThen ? (
                                        <div className="mt-2 text-[11px] text-white/55">
                                            Plan: “{todayLog.ifThen}”
                                        </div>
                                    ) : null}
                                </>
                            ) : (
                                <>
                                    Aún no has hecho check-in. Hazlo en 2 min
                                    para que Focus te quede “en piloto
                                    automático”.
                                </>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-sm font-semibold">Vence hoy</div>
                        <div className="mt-2 space-y-2">
                            {dueToday.length === 0 ? (
                                <div className="text-xs text-white/55">
                                    No tienes tareas con deadline hoy. Si algo
                                    es “para hoy”, ponle 📅.
                                </div>
                            ) : (
                                dueToday.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                                    >
                                        <div>
                                            <div className="text-sm">
                                                {t.title}
                                            </div>
                                            <div className="text-[11px] text-white/50">
                                                Prioridad: {t.priority} ·{' '}
                                                {t.dueAt
                                                    ? new Intl.DateTimeFormat(
                                                          'es-CO',
                                                          {
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          },
                                                      ).format(t.dueAt)
                                                    : ''}
                                            </div>
                                        </div>
                                        <div className="text-xs text-white/55">
                                            → Focus
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <TradingLineChart
                    title="Focus minutes / day"
                    data={stats.series}
                />
                <TradingHistogram
                    title="Panic uses / day"
                    data={stats.panicSeries}
                />
            </section>
        </div>
    );
}
