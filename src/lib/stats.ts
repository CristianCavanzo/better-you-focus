import { prisma } from "@/src/lib/prisma";

function dayKey(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function getDashboardStats(userId: string, days = 14) {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  const [blocks, panic] = await Promise.all([
    prisma.focusBlock.findMany({
      where: { userId, endedAt: { not: null }, startedAt: { gte: start } },
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
    d.setUTCDate(start.getUTCDate() + i);
    focusByDay.set(dayKey(d), 0);
    panicByDay.set(dayKey(d), 0);
  }

  for (const b of blocks) {
    const key = dayKey(b.startedAt);
    const seconds = b.actualSeconds ?? b.plannedSeconds;
    focusByDay.set(key, (focusByDay.get(key) ?? 0) + seconds);
  }
  for (const p of panic) {
    const key = dayKey(p.createdAt);
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
