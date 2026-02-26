import { prisma } from "@/src/lib/prisma";

function dayKeyBogota(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

export async function getDashboardStats(userId: string, days = 14) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const [blocks, panic] = await Promise.all([
    prisma.focusBlock.findMany({
      where: {
        userId,
        endedAt: { not: null },
        startedAt: { not: null, gte: start }
      },
      orderBy: { startedAt: "asc" }
    }),
    prisma.panicEvent.findMany({
      where: { userId, createdAt: { gte: start } },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const focusByDay = new Map<string, number>();
  const panicByDay = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    focusByDay.set(dayKeyBogota(d), 0);
    panicByDay.set(dayKeyBogota(d), 0);
  }

  for (const b of blocks) {
    if (!b.startedAt) continue;
    const key = dayKeyBogota(b.startedAt);
    const seconds = b.actualSeconds ?? b.plannedSeconds;
    focusByDay.set(key, (focusByDay.get(key) ?? 0) + seconds);
  }
  for (const p of panic) {
    const key = dayKeyBogota(p.createdAt);
    panicByDay.set(key, (panicByDay.get(key) ?? 0) + 1);
  }

  const series = Array.from(focusByDay.entries()).map(([time, seconds]) => ({
    time,
    value: Math.round((seconds / 60) * 10) / 10 // minutos
  }));

  const panicSeries = Array.from(panicByDay.entries()).map(([time, count]) => ({
    time,
    value: count
  }));

  // streak = días consecutivos con >= 1 minuto focus (desde hoy hacia atrás)
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if ((series[i]?.value ?? 0) > 0) streak++;
    else break;
  }

  const totalMinutes = series.reduce((a, x) => a + x.value, 0);

  return { series, panicSeries, streak, totalMinutes };
}
