import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/src/lib/prisma";
import { makeInitialState } from "@/src/lib/focusLogic";
import { SyncPayload } from "@/src/types/focus";

async function getUserIdOrNull(): Promise<string | null> {
  const { userId } = auth();
  return userId ?? null;
}

export async function GET() {
  const userId = await getUserIdOrNull();

  // demo single-user: usamos un user "demo" si no hay auth
  const effectiveUserId = userId ?? "demo";

  // asegura user
  await prisma.user.upsert({
    where: { id: effectiveUserId },
    update: {},
    create: { id: effectiveUserId }
  });

  // carga todo
  const [categories, tasks, blocks, selections] = await Promise.all([
    prisma.category.findMany({ where: { userId: effectiveUserId }, orderBy: { sortOrder: "asc" } }),
    prisma.task.findMany({ where: { userId: effectiveUserId }, orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }] }),
    prisma.focusBlock.findMany({ where: { userId: effectiveUserId }, orderBy: { startedAt: "asc" } }),
    prisma.focusBlockSelection.findMany({
      where: { block: { userId: effectiveUserId } },
      orderBy: [{ blockId: "asc" }, { sortOrder: "asc" }]
    })
  ]);

  // si está vacío, inicializa con defaults (en DB) para que Sync sea consistente
  if (categories.length === 0 && tasks.length === 0 && blocks.length === 0) {
    const initial = makeInitialState();

    await prisma.$transaction(async (tx) => {
      // categories
      for (const c of initial.categories) {
        await tx.category.create({
          data: { id: c.id, userId: effectiveUserId, name: c.name, sortOrder: c.sortOrder }
        });
      }
      // tasks
      for (const t of initial.tasks) {
        await tx.task.create({
          data: {
            id: t.id,
            userId: effectiveUserId,
            categoryId: t.categoryId,
            title: t.title,
            status: t.status,
            sortOrder: t.sortOrder
          }
        });
      }
    });

    return NextResponse.json({ ok: true, state: initial });
  }

  return NextResponse.json({
    ok: true,
    state: {
      version: 1,
      lastLocalEditAt: new Date().toISOString(),
      categories: categories.map(c => ({ id: c.id, name: c.name, sortOrder: c.sortOrder })),
      tasks: tasks.map(t => ({
        id: t.id,
        categoryId: t.categoryId,
        title: t.title,
        status: t.status,
        sortOrder: t.sortOrder,
        selectedAt: t.selectedAt?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null
      })),
      blocks: blocks.map(b => ({
        id: b.id,
        categoryId: b.categoryId,
        status: b.status,
        plannedSeconds: b.plannedSeconds,
        actualSeconds: b.actualSeconds,
        startedAt: b.startedAt.toISOString(),
        endedAt: b.endedAt?.toISOString() ?? null,
        allSelectedCompleted: b.allSelectedCompleted
      })),
      selections: selections.map(s => ({
        id: s.id,
        blockId: s.blockId,
        taskId: s.taskId,
        sortOrder: s.sortOrder,
        doneAt: s.doneAt?.toISOString() ?? null
      }))
    }
  });
}
