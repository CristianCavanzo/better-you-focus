import { makeInitialState } from "@/src/lib/focusLogic";
import { prisma } from "@/src/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

function dateKeyBogota(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

function isWeekdayBogota(d: Date) {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", weekday: "short" }).format(d);
  return wd !== "Sat" && wd !== "Sun";
}

async function getUserIdOrNull(): Promise<string | null> {
  const { userId } = auth();
  return userId ?? null;
}

export async function GET() {
  const userId = await getUserIdOrNull();

  // demo single-user: usamos un user "demo" si no hay auth
  const effectiveUserId = userId ?? "demo";

  // asegura user
  const user = await prisma.user.upsert({
    where: { id: effectiveUserId },
    update: {},
    create: { id: effectiveUserId },
    select: { id: true, lastStateAt: true }
  });

  let lastStateAt = user.lastStateAt;

  // carga todo
  const [categories, tasks, blocks, selections] = await Promise.all([
    prisma.category.findMany({
      where: { userId: effectiveUserId },
      orderBy: { sortOrder: "asc" }
    }),
    prisma.task.findMany({
      where: { userId: effectiveUserId },
      orderBy: [{ categoryId: "asc" }, { priority: "asc" }, { sortOrder: "asc" }]
    }),
    prisma.focusBlock.findMany({
      where: { userId: effectiveUserId },
      orderBy: [{ startedAt: "asc" }]
    }),
    prisma.focusBlockSelection.findMany({
      where: { block: { userId: effectiveUserId } },
      orderBy: [{ blockId: "asc" }, { sortOrder: "asc" }]
    })
  ]);

  // Repetición: resetea tasks repetidas (DONE ayer → PENDING hoy)
  // (Esto corre en el server para que el usuario NO tenga que “duplicar tasks” manualmente.)
  const todayKey = dateKeyBogota(new Date());
  const isWeekday = isWeekdayBogota(new Date());
  const toReset = tasks.filter((t) => {
    if (t.status !== "DONE") return false;
    if (!t.completedAt) return false;
    if (t.repeatCadence === "NONE") return false;
    if (t.repeatCadence === "WEEKDAYS" && !isWeekday) return false;
    const doneKey = dateKeyBogota(t.completedAt);
    return doneKey < todayKey;
  });

  if (toReset.length) {
    await prisma.task.updateMany({
      where: { id: { in: toReset.map((t) => t.id) } },
      data: { status: "PENDING", completedAt: null, selectedAt: null }
    });

    // bump watermark so el cliente re-hidrate (esto es un cambio server-side)
    lastStateAt = new Date();
    await prisma.user.update({
      where: { id: effectiveUserId },
      data: { lastStateAt }
    });

    // recarga tasks con cambios (solo si realmente reseteamos)
    const refreshed = await prisma.task.findMany({
      where: { userId: effectiveUserId },
      orderBy: [{ categoryId: "asc" }, { priority: "asc" }, { sortOrder: "asc" }]
    });
    tasks.splice(0, tasks.length, ...refreshed);
  }

  // si está vacío, inicializa con defaults (en DB) para que Sync sea consistente
  if (categories.length === 0 && tasks.length === 0 && blocks.length === 0) {
    const initial = makeInitialState();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const c of initial.categories) {
        await tx.category.create({
          data: {
            id: c.id,
            userId: effectiveUserId,
            name: c.name,
            sortOrder: c.sortOrder,
            defaultSeconds: c.defaultSeconds
          }
        });
      }

      for (const t of initial.tasks) {
        await tx.task.create({
          data: {
            id: t.id,
            userId: effectiveUserId,
            categoryId: t.categoryId,
            title: t.title,
            notes: t.notes ?? null,
            priority: t.priority,
            dueAt: t.dueAt ? new Date(t.dueAt) : null,
            estimateMinutes: t.estimateMinutes ?? null,
            repeatCadence: (t.repeatCadence as any) ?? "NONE",
            repeatTime: t.repeatTime ?? null,
            status: t.status,
            sortOrder: t.sortOrder
          }
        });
      }

      await tx.user.update({
        where: { id: effectiveUserId },
        data: { lastStateAt: new Date(initial.lastLocalEditAt) }
      });
    });

    return NextResponse.json({ ok: true, state: initial });
  }

  return NextResponse.json({
    ok: true,
    state: {
      version: 1,
      lastLocalEditAt: lastStateAt.toISOString(),
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        defaultSeconds: c.defaultSeconds
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        categoryId: t.categoryId,
        title: t.title,
        notes: t.notes ?? null,
        priority: t.priority,
        dueAt: t.dueAt?.toISOString() ?? null,
        estimateMinutes: t.estimateMinutes ?? null,
        repeatCadence: (t.repeatCadence as any) ?? "NONE",
        repeatTime: t.repeatTime ?? null,
        status: t.status,
        sortOrder: t.sortOrder,
        selectedAt: t.selectedAt?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null
      })),
      blocks: blocks.map((b) => ({
        id: b.id,
        categoryId: b.categoryId,
        status: b.status,
        plannedSeconds: b.plannedSeconds,
        actualSeconds: b.actualSeconds,
        startedAt: b.startedAt?.toISOString() ?? null,
        endedAt: b.endedAt?.toISOString() ?? null,
        endReason: b.endReason ?? null,
        allSelectedCompleted: b.allSelectedCompleted
      })),
      selections: selections.map((s) => ({
        id: s.id,
        blockId: s.blockId,
        taskId: s.taskId,
        sortOrder: s.sortOrder,
        doneAt: s.doneAt?.toISOString() ?? null
      }))
    }
  });
}
